#!/bin/bash

set -e

echo "Deploying AI Browser to Kubernetes..."

echo "1. Creating secrets..."
kubectl apply -f k8s/secrets.yaml

echo "2. Deploying PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

echo "3. Deploying Redis..."
kubectl apply -f k8s/redis.yaml

echo "4. Waiting for database to be ready..."
sleep 30

echo "5. Deploying backend..."
kubectl apply -f k8s/backend.yaml

echo "6. Deploying frontend..."
kubectl apply -f k8s/frontend.yaml

echo "7. Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

echo "8. Deploying monitoring..."
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml

echo "Deployment completed!"
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=ai-browser-backend --timeout=120s
kubectl wait --for=condition=ready pod -l app=ai-browser-frontend --timeout=120s

echo "All services are ready!"
echo "Frontend URL: http://ai-browser.local"
echo "Backend API: http://ai-browser.local/api"