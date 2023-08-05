// index.js
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/ywait_stg_insta_gcc", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Implement the API to fetch booking details on a particular date
app.get("/appointments", async (req, res) => {
  try {
    const { user_id, business_id, date } = req.query;
    const db = mongoose.connection.db;

    // validation for user & business
    const admin = await db.collection("admins").findOne({
      _id: new mongoose.Types.ObjectId(user_id),
      business_id: new mongoose.Types.ObjectId(business_id),
      is_blocked: false,
      status: "ACTIVE"
    });
    if(!admin) {
      res.status(400).json({ message: "Invalid User or Business" });
    }

    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    // find bookings
    const bookings = await db.collection("bookings")
      .find({
        business_id: new mongoose.Types.ObjectId(business_id),
        dateFrom: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    if (!bookings) {
      res.status(400).json({ message: "no bookings on the given date" });
    }

    const totalBookings = bookings.length;

    const newCustomersCount = await db.collection("customers")
      .countDocuments({
        business_id: new mongoose.Types.ObjectId(business_id),
        member_since: { $gte: startDate, $lte: endDate },
      });
      
    const walkinCustomersCount = [];

    const cancelledBookingsCount = bookings.filter(
      (booking) => booking.status === "CANCELLED"
    ).length;
    const noShowBookingsCount = bookings.filter(
      (booking) => booking.status === "NOSHOW"
    ).length;
    const availableConsultants = await db.collection("admins").countDocuments({
      business_id: new mongoose.Types.ObjectId(business_id),
      is_blocked: false,
      status: "ACTIVE",
      availability: "AVAILABLE"
    });

    res.json({
      totalBookings,
      newCustomersCount,
      walkinCustomersCount,
      cancelledBookingsCount,
      noShowBookingsCount,
      availableConsultants, // Implement your logic here to get available consultants.
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Implement the API to get average booking count between two dates grouped by each date
app.get('/averageBookingCount', async (req, res) => {
  try {
    const { user_id, business_id, from_date, to_date } = req.query;
    const db = mongoose.connection.db;

     // validation for user & business
     const admin = await db.collection("admins").findOne({
      _id: new mongoose.Types.ObjectId(user_id),
      business_id: new mongoose.Types.ObjectId(business_id),
      is_blocked: false,
      status: "ACTIVE"
    });
    if(!admin) {
      res.status(400).json({ message: "Invalid User or Business" });
    }


    const fromDate = new Date(from_date);
    fromDate.setUTCHours(0, 0, 0, 0);
    const toDate = new Date(to_date);
    toDate.setUTCHours(23, 59, 59, 999);

    const pipeline = [
      {
        $match: {
          business_id: new mongoose.Types.ObjectId(business_id),
          dateFrom: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateFrom" } },
          bookingCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          bookingCount: 1,
        },
      },
    ];

    const averageBookingCounts = await db.collection('bookings').aggregate(pipeline).toArray();

    res.json(averageBookingCounts);
  } catch (error) {
    console.error('Error getting average booking count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
