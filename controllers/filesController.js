require("dotenv").config();
const asyncHandler = require('express-async-handler');
const db = require("../db/queries");

const axios = require('axios');
const formatters = require('../utils/formatters');

const cloudinary = require('../utils/cloudinary.config');
const fs = require('fs');
const path = require('path');

const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');





const rootFolderDirectory = asyncHandler( async (req, res) => {
    const rootFolder = await db.getRootFolder(req.user.id);
    res.redirect(`/drive/${rootFolder.id}`);
});

const renderFolder = asyncHandler( async (req, res) => {
    const userId = req.user.id;
    const folderId = req.params.folderId;
    const folder = await db.getFolder(userId, folderId);

    if (!folder) {
        return res.status(404).send("Folder not found");
    }
    // Log the folder object to diagnose the issue
    //console.log('Folder Object:', JSON.stringify(folder, null, 2));

    // Format data
    const formattedFolder = {
        ...folder,

        formattedCreatedAt: formatters.formatDate(folder.createdAt),
        formattedUpdatedAt: formatters.formatDate(folder.updatedAt),

        subfolders: (folder.subfolders || []).map(subfolder => {
            if(!subfolder){
                console.warn('Null subfolder found:', subfolder);
                return {}; // Handle null subfolder
            }
            return {
                ...subfolder,
                formattedCreatedAt: formatters.formatDate(subfolder.createdAt),
                formattedUpdatedAt: formatters.formatDate(subfolder.updatedAt),
            };
            
        }),

        files: (folder.files || []).map(file => {
            if (!file){
                console.warn('Null file found:', file);
                return {}; // Handle null file
            }
            return {
                ...file,
                formattedSize: formatters.formatBytes(file.size),
                formattedCreatedAt: formatters.formatDate(file.createdAt),
                formattedUpdatedAt: formatters.formatDate(file.updatedAt),
            };
            
        })
    };

    res.render('fileDrive',{
        folder: formattedFolder
    })

});

const createSubfolder = asyncHandler( async (req, res) => {
    const userId = req.user.id;
    const parentId = req.params.folderId;

    await db.addSubfolder(userId, parentId);

    res.redirect(`/drive/${parentId}`);
});

const uploadFile = asyncHandler( async (req, res) => {
    if(!req.file){
        // Redirect back to the referring page
        const redirectUrl = req.get('Referer') || '/';
        return res.redirect(redirectUrl);
    }
    console.log('uploaded file to uploads:', req.file); // Log the file to see what is being received

    const folderId = req.params.folderId;
    // Multer metadata of upload
    const { originalname, size, path } = req.file;

    try {
        // Upload file to Cloudinary
        const result = await cloudinary.uploader.upload(path, {
            resource_type: 'auto'
        });

        // Add file to database
        await db.addFile(originalname, result.secure_url, size, folderId);

        // Redirect back to the referring page
        const redirectUrl = req.get('Referer') || `/`;
        res.redirect(redirectUrl);

        // Clear temporary local download
        fs.unlinkSync(path);

    } catch(error){
        console.error('Upload failed:', error);
        throw error;
    }
})

const renderFile = asyncHandler( async(req, res) => {
    const fileId = req.params.fileId;
    const file = await db.getFile(fileId);

    res.render('file', {
        file: {
            ...file,
            formattedSize: formatters.formatBytes(file.size),
        }
    });
});

const downloadFile = asyncHandler( async (req, res) => {
    const fileToDownload = req.params.fileId;
    const file = await db.getFile(fileToDownload);

    try {
        // Use Axios to stream the file from Cloudinary
        const response = await axios.get(file.path, { responseType: 'stream' });

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename = "${file.name}"`);
        res.setHeader('Content-Type', response.headers['content-type']);

        // Stream the file to the response
        response.data.pipe(res);
    } catch (error){
        console.error('Error downloading file:', error);
        res.redirect(`/drive/${file.folderId}`);
    }
});

const renameByTypeAndId = asyncHandler ( async(req, res) => {
    const type = req.params.type;
    const idToUpdate = req.params.id;

    const { name } = req.body;

    await db.reName(type, idToUpdate, name);

    // Redirect back to the referring page
    const redirectUrl = req.get('Referer') || `/`;
    res.redirect(redirectUrl);
});

const deleteByTypeAndId = asyncHandler( async(req, res) => {
    const type = req.params.type;
    const idToUpdate = req.params.id;

    await db.deLete(type, idToUpdate);

    // Redirect back to the referring page
    const redirectUrl = req.get('Referer') || `/`;
    res.redirect(redirectUrl);
})

// All folders and all files
const allFolders = asyncHandler( async (req, res) => {
    const userId = req.user.id;
    const folders = await db.getAllFolders(userId);

    
    // Format dates
    const formattedFolders = folders.map(folder => ({
        ...folder,
        formattedCreatedAt: formatters.formatDate(folder.createdAt),
        formattedUpdatedAt: formatters.formatDate(folder.updatedAt),
    }));

    res.render('foldersOnly', { folders: formattedFolders });
});

// All folders and all files
const allFiles = asyncHandler( async (req, res) => {
    const userId = req.user.id;
    const files = await db.getAllFiles(userId);

    // Format dates and sizes
    const formattedFiles = files.map(file => ({
        ...file,
        formattedSize: formatters.formatBytes(file.size),
        formattedCreatedAt: formatters.formatDate(file.createdAt),
        formattedUpdatedAt: formatters.formatDate(file.updatedAt),
    }));

    res.render('filesOnly', { files: formattedFiles });
});


// Want to share folders and files
const createShareLink = asyncHandler( async (req, res) => {

    const { shareId, shareType, duration, email, authPassword } = req.body;

    // Validate the authorization password
    if (authPassword !== process.env.SHARE_FILE_AUTH_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized: Invalid authorization password" });
    }

    const linkId = uuidv4(); // Generate a unique link ID

    console.log("Received duration in controller:", duration); // Debugging statement


    await db.shareAnyLink(shareId, shareType, linkId, duration);

    // Generate the full link
    const fullLink = `${req.protocol}://${req.get('host')}/share/${linkId}`;

    await sendShareLinkEmail(email, fullLink);
    res.redirect('/drive'); // Redirect to the file/folder view or show a success message
});



// Sending email with Nodemailer
async function sendShareLinkEmail(to, link) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to,
        subject: 'Shared Folder/File Link',
        text: `Access the shared folder/file using this link: ${link}`
    };

    return transporter.sendMail(mailOptions);
}


module.exports = {
    rootFolderDirectory,
    renderFolder,
    createSubfolder,
    uploadFile,
    renderFile,
    downloadFile,
    renameByTypeAndId,
    deleteByTypeAndId,
    allFolders,
    allFiles,
    createShareLink
};