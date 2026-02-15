exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    return res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: req.file.path, // Cloudinary URL
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Image upload failed",
    });
  }
};
