const mongoose = require('mongoose');

const contentCreatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  images: [{
    type: String, // Cloudinary URL strings
    required: true,
  }],
  following: {
    youtube: {
      type: Number,
      default: 0,
    },
    linkedin: {
      type: Number,
      default: 0,
    },
    instagram: {
      type: Number,
      default: 0,
    },
    // We can add more platforms if needed
  }
}, { timestamps: true });

module.exports = mongoose.model('ContentCreator', contentCreatorSchema);
