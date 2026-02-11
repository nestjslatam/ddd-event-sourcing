# BankAccount Sample - Quick Test Guide

## 🚀 Quick Start

### 1. Start the Application

```bash
# Start MongoDB
docker-compose up -d

# Start the app
npm run start:dev
```

### 2. Test Basic Operations

```bash
# Open an account
curl -X POST http://localhost:3000/bank-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-001",
    "holderName": "Alice Smith",
    "initialBalance": 1000,
    "currency": "USD"
  }'

# Deposit money
curl -X POST http://localhost:3000/bank-accounts/acc-001/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'

# Withdraw money
curl -X POST http://localhost:3000/bank-accounts/acc-001/withdraw \
  -H "Content-Type: application/json" \
  -d '{"amount": 200}'

# Get account
curl http://localhost:3000/bank-accounts/acc-001
```

---

## 🎯 Test Phase 1 Features

### Test Snapshots (Event Count Strategy)

```bash
# Create account
curl -X POST http://localhost:3000/bank-accounts \
  -H "Content-Type: application/json" \
  -d '{"accountId": "acc-snapshot", "holderName": "Bob", "initialBalance": 1000}'

# Make 15 deposits (triggers snapshot at event 10)
for i in {1..15}; do
  curl -X POST http://localhost:3000/bank-accounts/acc-snapshot/deposit \
    -H "Content-Type: application/json" \
    -d '{"amount": 100}'
  echo "Deposit $i done"
done

# Check MongoDB for snapshot
# db.snapshots.find({aggregateId: "acc-snapshot"})
```

### Test Idempotent Handlers

```bash
# Deposit money
curl -X POST http://localhost:3000/bank-accounts/acc-001/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'

# Check balance
curl http://localhost:3000/bank-accounts/acc-001

# Manually replay the event (if you have access to event store)
# The projector will skip it - balance won't change!
```

---

## 🚀 Test Phase 2 Features

### Test Materialized Views

```bash
# Get account summary (first time - slow, computed)
time curl http://localhost:3000/bank-accounts/acc-001/summary

# Get account summary again (fast, from cache!)
time curl http://localhost:3000/bank-accounts/acc-001/summary

# Get account statistics (cached for 5 minutes)
curl http://localhost:3000/bank-accounts/acc-001/statistics
```

### Test Cache Invalidation

```bash
# Get summary (cached)
curl http://localhost:3000/bank-accounts/acc-001/summary

# Make a deposit (invalidates cache)
curl -X POST http://localhost:3000/bank-accounts/acc-001/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 250}'

# Get summary again (recomputed, fresh data)
curl http://localhost:3000/bank-accounts/acc-001/summary
```

---

## 📊 Performance Testing

### Test Event Batching

```bash
# Create account for load testing
curl -X POST http://localhost:3000/bank-accounts \
  -H "Content-Type: application/json" \
  -d '{"accountId": "acc-load", "holderName": "Load Test", "initialBalance": 10000}'

# Rapid deposits (batching improves throughput)
for i in {1..100}; do
  curl -X POST http://localhost:3000/bank-accounts/acc-load/deposit \
    -H "Content-Type: application/json" \
    -d '{"amount": 10}' &
done
wait

echo "All deposits completed!"
```

### Measure Snapshot Performance

```bash
# Account with no snapshot (slow rehydration)
curl -X POST http://localhost:3000/bank-accounts \
  -d '{"accountId": "acc-no-snap", "holderName": "No Snapshot", "initialBalance": 1000}'

# Make 5 deposits
for i in {1..5}; do
  curl -X POST http://localhost:3000/bank-accounts/acc-no-snap/deposit \
    -d '{"amount": 100}'
done

# Time the read (5 events to replay)
time curl http://localhost:3000/bank-accounts/acc-no-snap

# Account with snapshot (fast rehydration)
# Make 15 deposits (creates snapshot at 10)
for i in {1..15}; do
  curl -X POST http://localhost:3000/bank-accounts/acc-snapshot/deposit \
    -d '{"amount": 100}'
done

# Time the read (snapshot + 5 events)
time curl http://localhost:3000/bank-accounts/acc-snapshot
# Should be faster!
```

---

## 🔍 Inspect the Data

### MongoDB Queries

```javascript
// Connect to MongoDB
mongo

// Use the database
use event-sourcing

// View events
db.events.find({streamId: "acc-001"}).pretty()

// View snapshots
db.snapshots.find({aggregateId: "acc-001"}).pretty()

// View processed events (idempotency tracking)
db.processedevents.find().pretty()

// View read model
db.bankaccountviews.find().pretty()
```

---

## ✅ Expected Results

### After Opening Account
```json
{
  "message": "Account opened successfully",
  "accountId": "acc-001"
}
```

### After Deposit
```json
{
  "message": "Money deposited successfully",
  "amount": 500
}
```

### Get Account
```json
{
  "_id": "acc-001",
  "holderName": "Alice Smith",
  "balance": 1300,
  "currency": "USD"
}
```

### Get Summary (Materialized View)
```json
{
  "accountId": "acc-001",
  "holderName": "Alice Smith",
  "balance": 1300,
  "currency": "USD",
  "lastUpdated": "2026-02-11T13:00:00.000Z"
}
```

### Get Statistics (Materialized View)
```json
{
  "accountId": "acc-001",
  "totalDeposits": 5000,
  "totalWithdrawals": 2000,
  "transactionCount": 15,
  "averageTransactionAmount": 466.67
}
```

---

## 🎓 What to Observe

1. **Snapshots**: Check MongoDB after 10+ events - see snapshot document
2. **Idempotency**: Replay events - balance doesn't change
3. **Caching**: First summary call slow, second call instant
4. **Batching**: 100 concurrent deposits complete quickly
5. **Performance**: Snapshot-enabled accounts load faster

---

## 💡 Tips

- Use `time` command to measure response times
- Check MongoDB to see snapshots and processed events
- Try different snapshot thresholds in `BankAccountModule`
- Adjust TTL values in `AccountViewService`
- Monitor logs to see saga executions

**Happy testing!** 🚀
