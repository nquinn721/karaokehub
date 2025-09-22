# iTunes API Rate Limiting Monitoring System

## Overview

Complete monitoring system for iTunes API usage with real-time rate limiting detection, comprehensive logging, and admin dashboard.

## Features Implemented

### ✅ Database Logging

- **Table**: `api_logs` with comprehensive fields for API monitoring
- **Rate Limiting Detection**: Dedicated fields for tracking rate limits
- **Performance Monitoring**: Response time tracking
- **Error Handling**: Complete error logging with stack traces
- **Indexing**: Optimized queries for provider, timestamp, and rate limiting

### ✅ Backend Services

- **ApiLogService**: Core logging service with statistics aggregation
- **Enhanced MusicService**: Integrated logging for all iTunes API calls
- **Admin Controller**: API endpoints for monitoring dashboard
- **Module Integration**: Proper module configuration

### ✅ Frontend Dashboard

- **Real-time Monitoring**: Auto-refresh every 30 seconds
- **Statistics Overview**: Request counts, error rates, rate limiting alerts
- **Filterable Logs**: Filter by provider, log type, and time range
- **Visual Indicators**: Color-coded status and alert system
- **30-Second Preview Tracking**: Dedicated monitoring for preview access

### ✅ Rate Limiting Features

- **Detection**: Automatic 429 status code detection
- **Circuit Breaker**: Protection against repeated rate limiting
- **Retry Logic**: Built-in retry mechanisms with exponential backoff
- **Alerting**: Real-time alerts in admin dashboard

## File Structure

```
src/
├── logs/
│   ├── api-log.entity.ts           # Database entity
│   ├── api-log.service.ts          # Business logic service
│   └── logs.module.ts              # Module configuration
├── admin/
│   └── api-logs.controller.ts      # Admin API endpoints
├── music/
│   └── music.service.ts            # Enhanced with logging
└── frontend/
    └── components/admin/
        └── ApiLogsMonitor.tsx      # React monitoring dashboard

migrations/
└── CreateApiLogsTable.sql          # Database setup
```

## Database Schema

### api_logs Table

- **id**: Primary key (UUID)
- **provider**: ITUNES, SPOTIFY, DEEZER, YOUTUBE
- **logType**: REQUEST, RESPONSE, ERROR, RATE_LIMIT, CIRCUIT_BREAKER
- **level**: INFO, WARN, ERROR, DEBUG
- **endpoint**: iTunes API endpoint called
- **httpMethod**: GET, POST, etc.
- **statusCode**: HTTP response code
- **responseTime**: Response time in milliseconds
- **isRateLimit**: Boolean flag for rate limiting events
- **rateLimitHeader**: Rate limit header values
- **retryAfter**: Retry-After header value
- **circuitBreakerState**: CLOSED, OPEN, HALF_OPEN
- **timestamp**: When the log was created

## API Endpoints

### Admin Endpoints

- `GET /admin/api-logs/stats` - Get statistics overview
- `GET /admin/api-logs` - Get filtered logs with pagination
- `DELETE /admin/api-logs/cleanup` - Clean up old logs

## Usage Examples

### Logging iTunes API Calls

```typescript
// Automatically logged in MusicService
const result = await this.musicService.searchMusic(query);

// Manual logging for specific events
await this.apiLogService.logApiCall({
  provider: ApiProvider.ITUNES,
  endpoint: '/search',
  httpMethod: 'GET',
  statusCode: 200,
  responseTime: 150,
});
```

### Accessing Monitoring Dashboard

1. Navigate to Admin Panel → API Logs Monitor
2. View real-time statistics and alerts
3. Filter logs by provider, type, or date range
4. Monitor rate limiting events and response times

## Rate Limiting Protection

### Automatic Detection

- Monitors HTTP 429 responses
- Tracks rate limit headers
- Records retry-after values

### Circuit Breaker Pattern

- Opens circuit after consecutive rate limits
- Provides graceful degradation
- Automatic recovery with half-open state

### Retry Logic

- Exponential backoff on rate limits
- Respects retry-after headers
- Maximum retry attempts configuration

## Installation & Setup

### 1. Database Migration

```sql
-- Run the migration file
mysql -u username -p database_name < migrations/CreateApiLogsTable.sql
```

### 2. Module Integration

The logging system is automatically integrated when you:

- Import `LogsModule` in your app module
- Use the enhanced `MusicService`
- Access the admin dashboard

### 3. Environment Variables

No additional environment variables required - uses existing iTunes API configuration.

## Monitoring & Maintenance

### Daily Monitoring

- Check rate limiting alerts in dashboard
- Monitor response time trends
- Review error patterns

### Log Cleanup

- Automatic cleanup service removes logs older than 90 days
- Manual cleanup available via admin endpoint
- Configurable retention period

### Performance

- Indexed database queries for fast retrieval
- Pagination for large result sets
- Efficient memory usage with streaming

## Statistics Tracked

### Request Statistics

- Total requests per provider
- Average response time
- Success/error rates
- Rate limiting frequency

### Performance Metrics

- Response time percentiles
- Error rate trends
- Rate limiting impact
- Circuit breaker activations

### 30-Second Preview Monitoring

- Preview access frequency
- Preview-specific rate limiting
- User behavior tracking
- Abuse detection

## Alerts & Notifications

### Rate Limiting Alerts

- Real-time dashboard notifications
- Color-coded severity levels
- Historical rate limiting trends
- Recovery time tracking

### Error Monitoring

- HTTP error tracking
- Network failure detection
- Service availability monitoring
- Performance degradation alerts

## Integration Status

✅ **Complete Implementation**

- Database schema created
- Backend services implemented
- Frontend dashboard ready
- iTunes API integration complete
- Rate limiting detection active
- Circuit breaker pattern implemented
- Admin monitoring dashboard functional

## Next Steps

1. **Deploy Database Migration**: Run the SQL migration file
2. **Test Monitoring**: Make iTunes API calls and verify logging
3. **Access Dashboard**: Navigate to admin panel to view real-time monitoring
4. **Configure Alerts**: Set up any additional alerting mechanisms
5. **Production Deployment**: Deploy the enhanced monitoring system

The iTunes API rate limiting monitoring system is now fully implemented and ready for production use!
