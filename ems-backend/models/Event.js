import mongoose from "mongoose";

export const EVENT_TYPES = [
  "Seminar",
  "Workshop",
  "Webinar",
  "Conference",
  "Performance",
  "Sports",
  "Orientation",
  "Other",
];

const speakerSchema = new mongoose.Schema(
  {
    clientKey: { type: String, required: true, trim: true, maxlength: 80 },
    name: {
      type: String,
      required: [true, "Speaker name is required"],
      trim: true,
      minlength: [2, "Speaker name must be at least 2 characters long"],
      maxlength: [120, "Speaker name must be 120 characters or fewer"],
    },
    role: {
      type: String,
      required: [true, "Speaker role is required"],
      trim: true,
      minlength: [2, "Speaker role must be at least 2 characters long"],
      maxlength: [120, "Speaker role must be 120 characters or fewer"],
    },
    photoUrl: { type: String, trim: true },
    photoPublicId: { type: String, trim: true, select: false },
  },
  { _id: true },
);

const agendaItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Agenda title is required"],
      trim: true,
      minlength: [2, "Agenda title must be at least 2 characters long"],
      maxlength: [160, "Agenda title must be 160 characters or fewer"],
    },
    description: { type: String, trim: true, maxlength: 500 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    speakerKeys: [{ type: String, trim: true, maxlength: 80 }],
  },
  { _id: true },
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [120, "Title must be less than 120 characters long"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [1000, "Description must be less than 1000 characters long"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      minlength: [3, "Location must be at least 3 characters long"],
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    organizerName: {
      type: String,
      trim: true,
      minlength: [3, "Organization name must be at least 3 characters long"],
      maxlength: [120, "Organization name must be 120 characters or fewer"],
    },
    eventType: {
      type: String,
      enum: EVENT_TYPES,
      default: "Other",
      required: true,
    },
    tags: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 40 }],
      default: [],
      validate: {
        validator: (value) => value.length <= 8,
        message: "Events can have up to 8 tags",
      },
    },
    agenda: {
      type: [agendaItemSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 40,
        message: "Events can have up to 40 agenda items",
      },
    },
    speakers: {
      type: [speakerSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 30,
        message: "Events can have up to 30 speakers",
      },
    },
    requirements: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 240 }],
      default: [],
      validate: {
        validator: (value) => value.length <= 20,
        message: "Events can have up to 20 requirements",
      },
    },
    reminders: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 240 }],
      default: [],
      validate: {
        validator: (value) => value.length <= 20,
        message: "Events can have up to 20 reminders",
      },
    },
    registrationMode: {
      type: String,
      enum: ["none", "required"],
      default: "none",
      required: true,
    },
    registrationForm: {
      version: { type: Number, default: 1, min: 1 },
      items: {
        type: [{
          key: { type: String, required: true },
          type: { type: String, required: true },
          label: { type: String, required: true },
          helpText: { type: String, default: "" },
          required: { type: Boolean, default: false },
          options: { type: [String], default: [] },
        }],
        default: [],
      },
    },
    registrationFormId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegistrationForm",
      default: null,
    },
    capacity: {
      type: Number,
      min: [1, "Capacity must be at least 1"],
      max: [100000, "Capacity must be 100000 or fewer"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      select: false,
    },
    imageUrl: { type: String },
    imagePublicId: { type: String, select: false },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },

    // status: {
    //   type: String,
    //   enum: ["Event Ended", "Event Ongoing", "Coming Soon"],
    //   default: "Coming Soon",
    //   required: true,
    // },
  },
  { timestamps: true },
);

eventSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate("endDate", "End date must be after the start date");
  }

  if (this.registrationMode === "none") this.capacity = undefined;
  if (this.agenda?.some((item) => item.endDate <= item.startDate)) {
    this.invalidate("agenda", "Each agenda item must end after it starts");
  }

  if ((this.isNew || this.isModified("agenda")) && this.agenda?.some((item, index) => (
    index > 0 && item.startDate < this.agenda[index - 1].endDate
  ))) {
    this.invalidate("agenda", "Agenda items must be ordered and cannot overlap");
  }

  const speakerKeys = new Set((this.speakers || []).map((speaker) => speaker.clientKey));
  if (this.agenda?.some((item) => item.speakerKeys?.some((key) => !speakerKeys.has(key)))) {
    this.invalidate("agenda", "Agenda items can only reference speakers in this event");
  }
});

const Event = mongoose.model("Event", eventSchema);

export default Event;
