import { Controller, Get, Query } from '@nestjs/common';

@Controller('test-monitoring')
export class TestMonitoringController {
  constructor() {}

  @Get('generate-data')
  async generateTestData(@Query('count') count: string = '5') {
    const testQueries = ['love', 'rock', 'pop', 'jazz', 'country'];
    const results = [];

    for (let i = 0; i < parseInt(count); i++) {
      const query = testQueries[i % testQueries.length];

      try {
        // Make a test call to the music search endpoint
        const response = await fetch(
          `http://localhost:3001/music/search?q=${query}&type=song&limit=5`,
        );
        const data = await response.json();

        results.push({
          query,
          status: response.status,
          results: data.length || 0,
        });

        // Add a small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          query,
          error: error.message,
        });
      }
    }

    return {
      message: 'Test data generation completed',
      results,
      note: 'Check the API monitoring dashboard for new data',
    };
  }
}
