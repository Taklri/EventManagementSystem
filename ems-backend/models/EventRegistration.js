import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["registered", "cancelled", "waitlisted"],
      default: "registered",
      required: true,
    },
    registeredAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date },
    formVersion: { type: Number, default: 1 },
    submittedAt: { type: Date },
    answers: {
      type: [{
        key: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed },
      }],
      default: [],
    },
  },
  { timestamps: true },
);

eventRegistrationSchema.index({ event: 1, student: 1 }, { unique: true });
eventRegistrationSchema.index({ event: 1, status: 1, createdAt: 1 });

const EventRegistration = mongoose.model("EventRegistration", eventRegistrationSchema);

export default EventRegistration;
