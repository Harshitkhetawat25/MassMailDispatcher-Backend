const express = require('express');
const templateRouter = express.Router();
const templateController = require('../controllers/templateController');
const isAuth = require('../middleware/isAuth');

templateRouter.post('/addtemplate', isAuth, templateController.addTemplate);
templateRouter.put('/updatetemplate/:id', isAuth, templateController.updateTemplate);
templateRouter.delete('/deletetemplate/:id', isAuth, templateController.deleteTemplate);

module.exports = templateRouter;