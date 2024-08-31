
const { Router } = require("express");
const filesController = require("../controllers/filesController");
const filesRouter = Router();

// for uploading files
const multer = require('multer');
const upload = multer({
    limits: { fileSize: 10485760 },
    dest: 'uploads/'
})



filesRouter.get("/", filesController.rootFolderDirectory);

filesRouter.get("/:folderId", filesController.renderFolder);


filesRouter.post("/:folderId/add-subfolder", filesController.createSubfolder);

// Save uploaded_file to local uploads/ folder temporarily
filesRouter.post("/:folderId/upload", upload.single('uploaded_file'), filesController.uploadFile);

// Get uploaded file
filesRouter.get('/file/:fileId', filesController.renderFile);

// Download file
filesRouter.get('/file/:fileId/download', filesController.downloadFile);

// Update + Delete post requests
filesRouter.post('/:type/:id/rename', filesController.renameByTypeAndId);
filesRouter.post('/:type/:id/delete',  filesController.deleteByTypeAndId);

// All folders and all files
filesRouter.get('/driveFolder/all-folders', filesController.allFolders);
filesRouter.get('/driveFolder/all-files', filesController.allFiles);


// Share folders and files
filesRouter.post('/share', filesController.createShareLink);

module.exports = filesRouter;