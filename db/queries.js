
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcryptjs');


async function findUser(colName, query){

    try{
        const whereCase = { [colName]: query };
        const user = await prisma.user.findUnique({
            where: whereCase
        })

        return user;
    } catch (error) {
        console.error(`Error finding user:`, error);
        throw error;
    }
}

async function signUp(signer) {

    const hash = await bcrypt.hash(signer.password, 10); // "Salting" - safe method against attack.

    const user = await prisma.user.create({
        data: {
            username: signer.username,
            email: signer.email,
            password: hash,
            folders: {
                create: {
                    name: 'My Folders'
                }
            }
        }
    })

    return user;
}

async function getRootFolder(userId){
    try{
        const user = await prisma.folder.findFirst({
            where: {
                userId: userId,
                parentId: null
            },
            include: {
                subfolders: true,
                files: true
            }
        });
        return user;
    } catch(error) {
        console.error('Error getting root', error);
        throw error;
    }
}

async function getFolder(userId, folderId){
    try{
        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: userId,
            },
            include: {
                parent: true,
                subfolders: {
                    orderBy: {
                        updatedAt: 'desc' //Orders subfolders by updatedAt in descending order
                    }
                },
                files: {
                    orderBy: {
                        updatedAt: 'desc' // Orders files by updatedAt in descending order
                    }
                }
            }
        });
        return folder;
    } catch(error) {
        console.error('Error getting folder', error);
        throw error;
    }
}

async function addSubfolder(userId, parentId){
    try{
        const newSubfolder = await prisma.folder.create({
            data: {
                name: "New Folder", // Name of the new subfolder
                userId: userId,  // User ID to associate with the new subfolder
                parentId: parentId // Set parentId to link to the parent folder
            }
        });
        return newSubfolder;
    } catch(error) {
        console.error('Error creating subfolder', error);
        throw error;
    }
}

async function addFile(name, path, size, folderId){
    try{
        const newFile = await prisma.file.create({
            data: {
                name: name,
                path: path,
                size: size, 
                folderId: folderId
            }
        });
        return newFile;
    } catch(error) {
        console.error('Error creating file', error);
        throw error;
    }
}

async function getFile(fileId){
    try{
        const file = await prisma.file.findFirst({
            where: {
                id: fileId
            },
            include: {
                folder: true
            }
        });
        return file;
    } catch(error) {
        console.error('Error getting file', error);
        throw error;
    }
}

async function reName(type, id, newName){
    try{
        const fileFolder = {
            where: {
                id: id
            },
            data: {
                name: newName,
            }
        };
        if(type === 'folder'){
            const updatedFolder = await prisma.folder.update(fileFolder);
            return updatedFolder;
        } else if(type === 'file'){
            const updatedFile = await prisma.file.update(fileFolder);
            return updatedFile;
        }
    } catch(error) {
        console.error('Error renaming', error);
        throw error;
    }
}

async function deLete(type, id){
    try{
        const fileFolder = {
            where: {
                id: id
            }
        };
        if(type === 'folder'){
            const deleteFolder = await prisma.folder.delete(fileFolder);
            return deleteFolder;
        } else if(type === 'file'){
            const deleteFile = await prisma.file.delete(fileFolder);
            return deleteFile;
        }
    } catch(error) {
        console.error('Error deleting', error);
        throw error;
    }
}



module.exports = {
    findUser,
    signUp,
    getRootFolder,
    getFolder,
    addSubfolder,
    addFile,
    getFile,
    reName,
    deLete
};