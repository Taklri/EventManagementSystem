import Event from '../models/Event.js';

export const createEvent = async (req, res) => {
    try{
        const {title, description, date, time, location, status} = req.body

        if(!title || !description || !date || !time || !location ){
            return res.status(400).json({
            message: "Please Fill in all required fields"
            })
        }

        const titleExist = await Event.findOne({title})

        if(titleExist){
            return res.status(400).json({
                message: "Event Already Exist"
            });
        }

        const event = await Event.create({ title, description, date, time, location, status});

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