const mongoose = require('mongoose');
const { Category } = require('../src/models');

const categories = [
  {
    name: 'Technology & IT',
    slug: 'technology-it',
    description: 'IT consulting, software development, cybersecurity, and tech support services',
    icon: '💻',
    order: 1
  },
  {
    name: 'Business & Finance',
    slug: 'business-finance',
    description: 'Financial consulting, business strategy, accounting, and investment advice',
    icon: '💼',
    order: 2
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Nutrition, fitness training, mental health counseling, and wellness coaching',
    icon: '🏥',
    order: 3
  },
  {
    name: 'Education & Learning',
    slug: 'education-learning',
    description: 'Tutoring, skill development, language learning, and educational consulting',
    icon: '📚',
    order: 4
  },
  {
    name: 'Creative & Design',
    slug: 'creative-design',
    description: 'Graphic design, content creation, photography, and creative consulting',
    icon: '🎨',
    order: 5
  },
  {
    name: 'Legal Services',
    slug: 'legal-services',
    description: 'Legal consultation, document review, and legal advice services',
    icon: '⚖️',
    order: 6
  },
  {
    name: 'Marketing & Sales',
    slug: 'marketing-sales',
    description: 'Digital marketing, sales consulting, and business development services',
    icon: '📈',
    order: 7
  },
  {
    name: 'Home & Construction',
    slug: 'home-construction',
    description: 'Home improvement, renovation, architecture, and construction consulting',
    icon: '🏠',
    order: 8
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Car maintenance, repair advice, and automotive consulting services',
    icon: '🚗',
    order: 9
  },
  {
    name: 'Personal Development',
    slug: 'personal-development',
    description: 'Life coaching, career counseling, and personal growth consulting',
    icon: '🌱',
    order: 10
  },
  {
    name: 'Food & Culinary',
    slug: 'food-culinary',
    description: 'Cooking classes, recipe development, and culinary consulting',
    icon: '🍳',
    order: 11
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Personal training, sports coaching, and fitness consulting',
    icon: '⚽',
    order: 12
  },
  {
    name: 'Travel & Tourism',
    slug: 'travel-tourism',
    description: 'Travel planning, destination guides, and tourism consulting',
    icon: '✈️',
    order: 13
  },
  {
    name: 'Environmental & Sustainability',
    slug: 'environmental-sustainability',
    description: 'Green consulting, sustainability advice, and environmental services',
    icon: '🌍',
    order: 14
  },
  {
    name: 'Arts & Entertainment',
    slug: 'arts-entertainment',
    description: 'Music lessons, art instruction, and entertainment consulting',
    icon: '🎭',
    order: 15
  },
  {
    name: 'Childcare & Education',
    slug: 'childcare-education',
    description: 'Childcare services, early education, and parenting consulting',
    icon: '👶',
    order: 16
  },
  {
    name: 'Pets & Animals',
    slug: 'pets-animals',
    description: 'Pet care, training, grooming, and veterinary consulting',
    icon: '🐾',
    order: 17
  },
  {
    name: 'Real Estate',
    slug: 'real-estate',
    description: 'Property consulting, real estate advice, and market analysis',
    icon: '🏢',
    order: 18
  },
  {
    name: 'Events & Planning',
    slug: 'events-planning',
    description: 'Event planning, party coordination, and celebration consulting',
    icon: '🎉',
    order: 19
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Beauty consulting, skincare advice, and personal care services',
    icon: '💄',
    order: 20
  }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillhub', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    const insertedCategories = await Category.insertMany(categories);
    console.log(`Successfully seeded ${insertedCategories.length} categories`);

    // Display the inserted categories
    console.log('\nSeeded Categories:');
    insertedCategories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name} (${category.slug}) - ${category.icon}`);
    });

    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeding function
if (require.main === module) {
  seedCategories();
}

module.exports = { seedCategories, categories };
