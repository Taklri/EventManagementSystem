import mongoose from "mongoose";

const registrationFormItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    type: {
      type: String,
      enum: [
        "text",
        "shortText",
        "longText",
        "multipleChoice",
        "multipleAnswer",
        "dropdown",
        "radio",
        "instructions",
      ],
      required: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 1000 },
    helpText: { type: String, trim: true, maxlength: 500, default: "" },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false },
);

const registrationFormSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    normalizedName: { type: String, required: true, unique: true, select: false },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    items: { type: [registrationFormItemSchema], default: [] },
    // Kept for compatibility with submitted registration records. Forms update in place.
    version: { type: Number, default: 1, min: 1 },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", select: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", select: false },
  },
  { timestamps: true },
);

registrationFormSchema.index({ isArchived: 1, updatedAt: -1 });

const RegistrationForm = mongoose.model("RegistrationForm", registrationFormSchema);

export default RegistrationForm;
