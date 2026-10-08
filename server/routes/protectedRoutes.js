
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, (req, res) => {
  res.status(200).json({
    message: "Protected route accessed successfully",
    userId: req.user.id
  });
});

module.exports = router;