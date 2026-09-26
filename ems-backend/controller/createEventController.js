import Event from '../models/Event.js';

export const createEvent = async (req, res) => {
    try{
        const {title, description, date, time, location, status, organizer} = req.body

        if(!title || !description || !date || !time || !location || !organizer ){
            return res.status(400).json({
            message: "Please Fill in all required fields"
            })
        }


        const event = await Event.create({ title, description, date, time, location, status, organizer});

        res.status(201).json({
            message: "Event created successfuly",
            event: event
        })

    }
    catch(err){
        res.status(500).json({
            message: "Failed to create event",
            error: err.message
        });
    }
}