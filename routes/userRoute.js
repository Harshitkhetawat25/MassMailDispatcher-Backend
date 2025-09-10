const express = require("express");
const isAuth = require("../middleware/isAuth");
const {
  getCurrentUser,
  updateName,
  changePassword,
} = require("../controllers/userController");
const userRouter = express.Router();

userRouter.get("/getcurrentuser", isAuth, getCurrentUser);

userRouter.put("/update-name", isAuth, updateName);
userRouter.put("/change-password", isAuth, changePassword);

module.exports = userRouter;
