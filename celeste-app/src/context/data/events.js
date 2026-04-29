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
  { id:1,  title:"Sharma Wedding Ceremony",    type:"Wedding",   venue:"Lawn",             scale:"Large",  month:"November", year:2024, planner:"Riya Mehta"       },
  { id:2,  title:"Rooftop Birthday Bash",       type:"Birthday",  venue:"Terrace",          scale:"Small",  month:"August",   year:2024, planner:"Ankit Sharma"     },
  { id:3,  title:"TechSummit 2024",             type:"Corporate", venue:"Convention Hall",  scale:"Large",  month:"March",    year:2024, planner:"Priya Nair"       },
  { id:4,  title:"Indie Music Night",           type:"Concert",   venue:"Amphitheatre",     scale:"Medium", month:"July",     year:2024, planner:"Dev Kapoor"       },
  { id:5,  title:"Holi Festival Celebration",   type:"Festival",  venue:"Ground",           scale:"Large",  month:"March",    year:2025, planner:"Sunita Rao"       },
  { id:6,  title:"Corporate Annual Meet",       type:"Corporate", venue:"Hotel Ballroom",   scale:"Large",  month:"January",  year:2025, planner:"Rohit Jain"       },
  { id:7,  title:"Kids Birthday Party",         type:"Birthday",  venue:"Home",             scale:"Small",  month:"December", year:2023, planner:"Anita Singh"      },
  { id:8,  title:"Outdoor Film Festival",       type:"Festival",  venue:"Lawn",             scale:"Medium", month:"October",  year:2024, planner:"Karan Bose"       },
  { id:9,  title:"IPL Watch Party",             type:"Sports",    venue:"Ground",           scale:"Medium", month:"April",    year:2024, planner:"Varun Chandra"    },
  { id:10, title:"Verma Wedding Reception",     type:"Wedding",   venue:"Banquet Hall",     scale:"Large",  month:"February", year:2025, planner:"Nisha Verma"      },
  { id:11, title:"Eco Hike & Bonfire",          type:"Outdoor",   venue:"Forest Clearing",  scale:"Small",  month:"June",     year:2024, planner:"Arjun Patel"      },
  { id:12, title:"Startup Expo 2024",           type:"Expo",      venue:"Exhibition Centre", scale:"Large", month:"September",year:2024, planner:"Meena Iyer"       },
  { id:13, title:"Classical Dance Recital",     type:"Cultural",  venue:"Auditorium",       scale:"Medium", month:"November", year:2023, planner:"Kavya Das"        },
  { id:14, title:"Charity Gala Night",          type:"Charity",   venue:"Hotel Ballroom",   scale:"Large",  month:"December", year:2024, planner:"Rajan Shah"       },
  { id:15, title:"Street Food Carnival",        type:"Food",      venue:"Ground",           scale:"Large",  month:"January",  year:2024, planner:"Neha Gupta"       },
  { id:16, title:"25th Anniversary Party",      type:"Birthday",  venue:"Lawn",             scale:"Medium", month:"May",      year:2024, planner:"Sanjay Kumar"     },
  { id:17, title:"Jazz & Wine Evening",         type:"Concert",   venue:"Terrace",          scale:"Small",  month:"August",   year:2023, planner:"Prita Malhotra"   },
  { id:18, title:"Product Launch Event",        type:"Corporate", venue:"Convention Hall",  scale:"Large",  month:"February", year:2024, planner:"Vivek Sinha"      },
  { id:19, title:"Diwali Mela",                 type:"Festival",  venue:"Ground",           scale:"Large",  month:"October",  year:2023, planner:"Pallavi Roy"      },
  { id:20, title:"Marathon & Sports Day",       type:"Sports",    venue:"Ground",           scale:"Large",  month:"November", year:2024, planner:"Rahul Tiwari"     },
  { id:21, title:"Garden Wedding Brunch",       type:"Wedding",   venue:"Lawn",             scale:"Medium", month:"April",    year:2025, planner:"Sneha Agarwal"    },
  { id:22, title:"Photography Exhibition",      type:"Cultural",  venue:"Art Gallery",      scale:"Small",  month:"March",    year:2025, planner:"Ananya Choudhary" },
  { id:23, title:"Craft Beer Festival",         type:"Food",      venue:"Amphitheatre",     scale:"Medium", month:"September",year:2023, planner:"Tarun Verma"      },
  { id:24, title:"School Annual Day",           type:"Cultural",  venue:"Auditorium",       scale:"Large",  month:"February", year:2024, planner:"Mrs. Sharma"      },
  { id:25, title:"Surprise House Party",        type:"Birthday",  venue:"Home",             scale:"Small",  month:"July",     year:2025, planner:"Akash Pandey"     },
];
