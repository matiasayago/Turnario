require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  const emailArg = process.argv[2];
  const email = String(emailArg || '').trim().toLowerCase();

  if (!email) {
    console.error('Uso: node scripts/clear-push-tokens.js <email>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
  await mongoose.connect(mongoUri);

  const result = await User.updateOne(
    { email },
    { $set: { expoPushTokens: [] } }
  );

  console.log(
    JSON.stringify(
      {
        email,
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('clear-push-tokens:', error?.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
