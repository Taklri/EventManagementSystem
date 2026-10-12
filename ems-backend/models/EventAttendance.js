import mongoose from "mongoose";

const eventAttendanceSchema = new mongoose.Schema(
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
    timeIn: { type: Date, required: true },
    timeOut: { type: Date },
  },
  { timestamps: true },
);

eventAttendanceSchema.index({ event: 1, student: 1 }, { unique: true });
eventAttendanceSchema.index({ event: 1, timeIn: 1 });

const EventAttendance = mongoose.model("EventAttendance", eventAttendanceSchema);

export default EventAttendance;
