export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
export const MONTH_IDX = Object.fromEntries(MONTHS.map((m, i) => [m, i]));

export const EVENT_CATEGORIES = [
  { type: "Wedding",   icon: "💍", bg: "#ffecd2" },
  { type: "Birthday",  icon: "🎂", bg: "#fed6e3" },
  { type: "Corporate", icon: "💼", bg: "#d4e1ff" },
  { type: "Concert",   icon: "🎵", bg: "#e1d4ff" },
  { type: "Festival",  icon: "🎊", bg: "#ffd4d4" },
  { type: "Sports",    icon: "🏆", bg: "#d4f4d4" },
  { type: "Outdoor",   icon: "🌿", bg: "#d4f0e8" },
  { type: "Expo",      icon: "🏛",  bg: "#e8e8e8" },
  { type: "Cultural",  icon: "🎭", bg: "#ffeaa7" },
  { type: "Charity",   icon: "❤️", bg: "#ffd4e8" },
  { type: "Food",      icon: "🍽",  bg: "#fff3d4" },
];

export const THEME_GRADIENTS = {
  Wedding:   ["#ffecd2","#fcb69f"],
  Birthday:  ["#a8edea","#fed6e3"],
  Corporate: ["#d4e1ff","#a8b8ff"],
  Concert:   ["#1a1a2e","#4a0080"],
  Festival:  ["#ff9a9e","#fad0c4"],
  Sports:    ["#b3f0a0","#4fc96d"],
  Outdoor:   ["#a8e6cf","#3d9970"],
  Expo:      ["#e0e0e0","#bdbdbd"],
  Cultural:  ["#ffeaa7","#fdcb6e"],
  Charity:   ["#fd79a8","#e84393"],
  Food:      ["#fddb92","#d1fdff"],
};

export const EVENTS = [
  { id:1,  title:"Sharma Wedding Ceremony",    type:"Wedding",   venue:"Lawn",             scale:"Large",  month:"November", year:2024, planner:"Riya Mehta",       price:85000,  image:"https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80" },
  { id:2,  title:"Rooftop Birthday Bash",       type:"Birthday",  venue:"Terrace",          scale:"Small",  month:"August",   year:2024, planner:"Ankit Sharma",     price:15000,  image:"https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" },
  { id:3,  title:"TechSummit 2024",             type:"Corporate", venue:"Convention Hall",  scale:"Large",  month:"March",    year:2024, planner:"Priya Nair",       price:120000, image:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80" },
  { id:4,  title:"Indie Music Night",           type:"Concert",   venue:"Amphitheatre",     scale:"Medium", month:"July",     year:2024, planner:"Dev Kapoor",       price:45000,  image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80" },
  { id:5,  title:"Holi Festival Celebration",   type:"Festival",  venue:"Ground",           scale:"Large",  month:"March",    year:2025, planner:"Sunita Rao",       price:60000,  image:"https://images.unsplash.com/photo-1615751072497-5f5169816c7e?w=600&q=80" },
  { id:6,  title:"Corporate Annual Meet",       type:"Corporate", venue:"Hotel Ballroom",   scale:"Large",  month:"January",  year:2025, planner:"Rohit Jain",       price:150000, image:"https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80" },
  { id:7,  title:"Kids Birthday Party",         type:"Birthday",  venue:"Home",             scale:"Small",  month:"December", year:2023, planner:"Anita Singh",      price:8000,   image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
  { id:8,  title:"Outdoor Film Festival",       type:"Festival",  venue:"Lawn",             scale:"Medium", month:"October",  year:2024, planner:"Karan Bose",       price:35000,  image:"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80" },
  { id:9,  title:"IPL Watch Party",             type:"Sports",    venue:"Ground",           scale:"Medium", month:"April",    year:2024, planner:"Varun Chandra",    price:25000,  image:"https://images.unsplash.com/photo-1540747913346-19212a729279?w=600&q=80" },
  { id:10, title:"Verma Wedding Reception",     type:"Wedding",   venue:"Banquet Hall",     scale:"Large",  month:"February", year:2025, planner:"Nisha Verma",      price:95000,  image:"https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80" },
  { id:11, title:"Eco Hike & Bonfire",          type:"Outdoor",   venue:"Forest Clearing",  scale:"Small",  month:"June",     year:2024, planner:"Arjun Patel",      price:10000,  image:"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80" },
  { id:12, title:"Startup Expo 2024",           type:"Expo",      venue:"Exhibition Centre", scale:"Large", month:"September",year:2024, planner:"Meena Iyer",       price:110000, image:"https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=600&q=80" },
  { id:13, title:"Classical Dance Recital",     type:"Cultural",  venue:"Auditorium",       scale:"Medium", month:"November", year:2023, planner:"Kavya Das",        price:30000,  image:"https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=600&q=80" },
  { id:14, title:"Charity Gala Night",          type:"Charity",   venue:"Hotel Ballroom",   scale:"Large",  month:"December", year:2024, planner:"Rajan Shah",       price:75000,  image:"https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80" },
  { id:15, title:"Street Food Carnival",        type:"Food",      venue:"Ground",           scale:"Large",  month:"January",  year:2024, planner:"Neha Gupta",       price:40000,  image:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80" },
  { id:16, title:"25th Anniversary Party",      type:"Birthday",  venue:"Lawn",             scale:"Medium", month:"May",      year:2024, planner:"Sanjay Kumar",     price:22000,  image:"https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80" },
  { id:17, title:"Jazz & Wine Evening",         type:"Concert",   venue:"Terrace",          scale:"Small",  month:"August",   year:2023, planner:"Prita Malhotra",   price:18000,  image:"https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&q=80" },
  { id:18, title:"Product Launch Event",        type:"Corporate", venue:"Convention Hall",  scale:"Large",  month:"February", year:2024, planner:"Vivek Sinha",      price:130000, image:"https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80" },
  { id:19, title:"Diwali Mela",                 type:"Festival",  venue:"Ground",           scale:"Large",  month:"October",  year:2023, planner:"Pallavi Roy",      price:55000,  image:"https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&q=80" },
  { id:20, title:"Marathon & Sports Day",       type:"Sports",    venue:"Ground",           scale:"Large",  month:"November", year:2024, planner:"Rahul Tiwari",     price:48000,  image:"https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&q=80" },
  { id:21, title:"Garden Wedding Brunch",       type:"Wedding",   venue:"Lawn",             scale:"Medium", month:"April",    year:2025, planner:"Sneha Agarwal",    price:70000,  image:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" },
  { id:22, title:"Photography Exhibition",      type:"Cultural",  venue:"Art Gallery",      scale:"Small",  month:"March",    year:2025, planner:"Ananya Choudhary", price:20000,  image:"https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=600&q=80" },
  { id:23, title:"Craft Beer Festival",         type:"Food",      venue:"Amphitheatre",     scale:"Medium", month:"September",year:2023, planner:"Tarun Verma",      price:32000,  image:"https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=600&q=80" },
  { id:24, title:"School Annual Day",           type:"Cultural",  venue:"Auditorium",       scale:"Large",  month:"February", year:2024, planner:"Mrs. Sharma",      price:28000,  image:"https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&q=80" },
  { id:25, title:"Surprise House Party",        type:"Birthday",  venue:"Home",             scale:"Small",  month:"July",     year:2025, planner:"Akash Pandey",     price:12000,  image:"https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=600&q=80" },
];
