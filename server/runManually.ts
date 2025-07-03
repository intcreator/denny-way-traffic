import { hourlyJob } from './index.js'

hourlyJob().then(() => {
    console.log("Hourly job completed successfully");
}).catch((error) => {
    console.error("Error running hourly job:", error);
});