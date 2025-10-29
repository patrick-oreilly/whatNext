# Fix: Cloud Run Multiple Instance Issue

## Problem
Cloud Run was auto-scaling to multiple instances, causing rooms created on one instance to not be visible on another instance.

## Solution Applied

### 1. Added Instance Tracking (Debugging)
- Added unique instance IDs to logs to track which instance handles each request
- Added detailed logging in `/api/rooms/join` endpoint to show available rooms

### 2. Quick Fix: Force Single Instance

**Option A: Using gcloud CLI (Fastest)**

```bash
gcloud run services update whats-next-backend \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=1 \
  --concurrency=80 \
  --memory=2Gi \
  --cpu=2
```

**Option B: Using the provided config file**

```bash
gcloud run services replace cloud-run-config.yaml \
  --region=us-central1
```

### 3. Verify the Fix

After deploying:

1. Check the logs - you should now see `[INSTANCE_ID]` in each log line
2. Create a room and join it - both requests should show the same `INSTANCE_ID`
3. The join request log should show: `Available rooms: ['YOUR_ROOM_CODE']`

## Long-term Solution

For production scale (multiple instances), you'll need shared storage:

### Option 1: Redis (Recommended)
- Fast, in-memory shared cache
- Perfect for temporary game room data
- Can be added to Cloud Run via Redis Cloud or Google Memorystore

### Option 2: Cloud Firestore
- Persistent database
- Native GCP integration
- Good for keeping game history

## Notes

- Current config sets `minScale=1, maxScale=1` to ensure only one instance runs
- This works well for games with moderate traffic (<100 concurrent users)
- If you need to scale beyond 1 instance, implement Redis storage

## Reverting

To allow auto-scaling again (after implementing Redis):

```bash
gcloud run services update whats-next-backend \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=10
```
