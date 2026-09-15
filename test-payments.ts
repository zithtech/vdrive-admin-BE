import { RechargePlanRepository } from './src/modules/rechargePlan/rechargePlan.repository';
import { connectDatabase } from './src/shared/database';
import { config } from 'dotenv';
config();

async function run() {
  try {
    await connectDatabase();
    const res = await RechargePlanRepository.getPayments(1, 10, "", "ALL");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR", err);
  } finally {
    process.exit(0);
  }
}

run();
