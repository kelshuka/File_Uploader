
const passport = require("passport");
const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const db = require("../db/queries");
const validateSignUp = require('../middleware/validateSignUp');

const axios = require('axios');
const formatters = require('../utils/formatters');

const cloudinary = require('../utils/cloudinary.config');

const fs = require('fs');
const path = require('path');


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


module.exports = {
    rootFolderDirectory,
    renderFolder,
    createSubfolder,
    uploadFile,
    renderFile,
    downloadFile,
    renameByTypeAndId,
    deleteByTypeAndId
};