import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../../.env") });

import mongoose from "mongoose";
import User from "./models/User";
import HelpRequest from "./models/HelpRequest";

// Ahmedabad neighbourhoods: [lon, lat]
const areas = [
  { name: "Navrangpura, Ahmedabad", coords: [72.5570, 23.0390] as [number, number] },
  { name: "Satellite, Ahmedabad", coords: [72.5100, 23.0300] as [number, number] },
  { name: "Vastrapur, Ahmedabad", coords: [72.5280, 23.0360] as [number, number] },
  { name: "Bodakdev, Ahmedabad", coords: [72.5095, 23.0525] as [number, number] },
  { name: "Prahlad Nagar, Ahmedabad", coords: [72.5060, 23.0125] as [number, number] },
  { name: "Maninagar, Ahmedabad", coords: [72.5975, 22.9870] as [number, number] },
  { name: "Bopal, Ahmedabad", coords: [72.4752, 23.0254] as [number, number] },
  { name: "Thaltej, Ahmedabad", coords: [72.5042, 23.0534] as [number, number] },
  { name: "Chandkheda, Ahmedabad", coords: [72.5870, 23.1050] as [number, number] },
  { name: "Gota, Ahmedabad", coords: [72.5710, 23.0945] as [number, number] },
];

const dummyUsers = [
  { name: "Priya Sharma", email: "priya.sharma@demo.com", area: 0 },
  { name: "Rohan Patel", email: "rohan.patel@demo.com", area: 1 },
  { name: "Meera Desai", email: "meera.desai@demo.com", area: 2 },
  { name: "Karan Shah", email: "karan.shah@demo.com", area: 3 },
  { name: "Anita Joshi", email: "anita.joshi@demo.com", area: 4 },
];

const requestTemplates = [
  {
    title: "Help me carry groceries from car to flat",
    description: "3rd floor, no lift. Need someone to help carry 4-5 bags.",
    category: "groceries",
    rewardType: "cash",
    rewardAmount: 100,
    areaIndex: 0,
  },
  {
    title: "Need help setting up new WiFi router",
    description: "Just moved in, router arrived but I'm not sure how to configure it.",
    category: "tech",
    rewardType: "food",
    rewardDescription: "I'll make chai and snacks!",
    areaIndex: 1,
  },
  {
    title: "Tutoring needed for Class 10 Maths",
    description: "My daughter needs help with algebra and geometry. 2 hours a week.",
    category: "tutoring",
    rewardType: "cash",
    rewardAmount: 500,
    areaIndex: 2,
  },
  {
    title: "Help moving boxes to new apartment",
    description: "Shifting within the same building. About 10 medium-sized boxes.",
    category: "moving",
    rewardType: "cash",
    rewardAmount: 300,
    areaIndex: 3,
  },
  {
    title: "Deep cleaning help needed for 2BHK",
    description: "Before Diwali cleaning. Need 2-3 hours of help.",
    category: "cleaning",
    rewardType: "cash",
    rewardAmount: 400,
    areaIndex: 4,
  },
  {
    title: "Laptop not turning on — need tech help",
    description: "Dell laptop suddenly stopped booting. May need basic troubleshooting.",
    category: "tech",
    rewardType: "cash",
    rewardAmount: 200,
    areaIndex: 5,
  },
  {
    title: "Need someone to fetch medicines from pharmacy",
    description: "Unwell at home, pharmacy is 500m away. Will give cash + medicine cost.",
    category: "groceries",
    rewardType: "cash",
    rewardAmount: 150,
    areaIndex: 6,
  },
  {
    title: "Help assembling IKEA-style furniture",
    description: "Wardrobe and study table, parts are here. Need 2-3 hours of help.",
    category: "other",
    rewardType: "food",
    rewardDescription: "Home-cooked Gujarati lunch included!",
    areaIndex: 7,
  },
  {
    title: "English speaking practice partner needed",
    description: "Preparing for interview. Need 1 hour of conversation practice daily.",
    category: "tutoring",
    rewardType: "favour",
    rewardDescription: "I can teach you Gujarati or help with coding in return.",
    areaIndex: 8,
  },
  {
    title: "Help shifting old sofa out of flat",
    description: "Old sofa needs to go to the ground floor. 2 people needed for 20 mins.",
    category: "moving",
    rewardType: "cash",
    rewardAmount: 200,
    areaIndex: 9,
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/helpnearby";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Remove existing demo users/requests to avoid duplicates on re-run
  const demoEmails = dummyUsers.map((u) => u.email);
  const existingUsers = await User.find({ email: { $in: demoEmails } });
  const existingIds = existingUsers.map((u) => u._id);
  await HelpRequest.deleteMany({ requester: { $in: existingIds } });
  await User.deleteMany({ email: { $in: demoEmails } });
  console.log("Cleared previous seed data");

  // Create users
  const createdUsers = await Promise.all(
    dummyUsers.map((u) => {
      const area = areas[u.area];
      return User.create({
        name: u.name,
        email: u.email,
        password: "Demo@1234",
        location: {
          type: "Point",
          coordinates: area.coords,
          address: area.name,
        },
        rating: parseFloat((4 + Math.random()).toFixed(1)),
        tasksHelped: Math.floor(Math.random() * 15),
      });
    })
  );
  console.log(`Created ${createdUsers.length} users`);

  // Create requests — spread across users round-robin
  const today = new Date();
  const futureDate = (daysAhead: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const requests = await Promise.all(
    requestTemplates.map((t, i) => {
      const requester = createdUsers[i % createdUsers.length];
      const area = areas[t.areaIndex];
      return HelpRequest.create({
        title: t.title,
        description: t.description,
        requester: requester._id,
        category: t.category,
        status: "active",
        date: futureDate(i + 1),
        time: `${9 + (i % 8)}:00`,
        location: {
          address: area.name,
          coordinates: area.coords,
        },
        rewardType: t.rewardType,
        rewardAmount: t.rewardAmount,
        rewardDescription: t.rewardDescription,
      });
    })
  );
  console.log(`Created ${requests.length} help requests`);

  console.log("\nSeed complete! Demo credentials:");
  dummyUsers.forEach((u) => {
    console.log(`  ${u.email} / Demo@1234  (${areas[u.area].name})`);
  });

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
