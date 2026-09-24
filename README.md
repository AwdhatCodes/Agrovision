# Agrovision 🌱

![Python](https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-PWA-61DAFB?logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/Flask-REST%20API-000000?logo=flask&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-AI%20Engine-009688?logo=fastapi&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-MobileNetV2-FF6F00?logo=tensorflow&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)

**Agrovision** is an AI-powered Progressive Web App (PWA) that helps smallholder potato farmers instantly diagnose crop diseases from a photo. A farmer uploads an image of a potato leaf, and in under 2 seconds the system classifies the disease, calculates the percentage of crop damage, and returns an explainable AI heatmap showing exactly where the damage is. The platform also includes **Agro-Bot**, an LLM-powered chatbot for treatment advice, and Google Maps integration to locate the nearest stocked agricultural supplier (agrovet).

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Team & Contributions](#team--contributions)

## Project Overview
Agrovision was built as a final-year capstone project to address a real problem faced by smallholder potato farmers in Kenya: limited access to fast, reliable crop disease diagnosis. Manual diagnosis is slow, requires expert knowledge that isn't always accessible, and delays treatment — often worsening crop loss. Agrovision closes that gap with a mobile-friendly, AI-driven diagnostic tool that works from a single photo.

## Features
- 📸 **Instant disease classification** — Early Blight, Late Blight, or Healthy, from a single leaf photo
- 📊 **Severity scoring** — calculates the exact percentage of crop damage using computer vision, not just a disease label
- 🔥 **Explainable AI (XAI)** — Grad-CAM heatmaps visually highlight which parts of the leaf drove the diagnosis, rather than acting as a "black box"
- 🤖 **Agro-Bot** — an LLM-powered chatbot that gives localized fungicide/treatment advice based on the diagnosis
- 🗺️ **Agrovet locator** — Google Maps integration to find the nearest stocked agricultural supplier
- 📱 **Progressive Web App** — installable, mobile-first experience with camera/gallery integration

## Architecture
Agrovision uses a decoupled 3-tier architecture, with each tier owned and built independently by a team member:

    ┌─────────────────────┐      ┌──────────────────────┐      ┌───────────────────────┐
    │   Zone 1: Frontend   │ ───► │  Zone 2: API Gateway  │ ───► │  Zone 3: AI Engine     │
    │   React.js PWA       │ ◄─── │  Flask + PostgreSQL   │ ◄─── │  FastAPI + TensorFlow  │
    └─────────────────────┘      └──────────────────────┘      └───────────────────────┘
       Camera/gallery UI            Auth, request routing,         Image classification,
       Diagnostic dashboard         diagnosis history,             severity scoring,
       Chat UI, map view            Maps API queries                Grad-CAM, LLM query

The frontend never talks to the AI engine directly — all requests are routed through the Flask gateway, which handles authentication, logs diagnosis history to PostgreSQL, and queries Google Maps for agrovet locations. The AI engine is a fully isolated service, callable independently of the rest of the stack.

## Tech Stack

**Zone 1 — Frontend**
- React.js (Progressive Web App)
- HTML / CSS / JavaScript
- Camera/gallery hardware integration, async state management

**Zone 2 — Backend Gateway & Database**
- Python, Flask
- PostgreSQL, Psycopg2
- REST API gateway, authentication, diagnosis history logging, Google Maps API integration

**Zone 3 — AI Intelligence Engine**
- Python, FastAPI (isolated microservice)
- TensorFlow/Keras — MobileNetV2, chosen for being lightweight and edge-deployment-capable, with a confidence threshold to reject unusable/unclear photos
- OpenCV (HSV color space masking) — deterministic severity scoring from necrotic vs. healthy pixel ratio
- Grad-CAM — explainable AI heatmap generation
- NumPy — numerical/image tensor processing
- PlantVillage (Kaggle) dataset — model training data
- External LLM API (OpenAI/Gemini) — treatment advice via Agro-Bot

## Setup & Installation

### Frontend (Zone 1)
    cd client
    npm install
    npm start

### Backend Gateway (Zone 2)
    cd server
    pip install -r requirements.txt
    # Configure PostgreSQL connection and Google Maps API key in .env
    python app.py

### AI Engine (Zone 3)
    cd ai_engine
    pip install -r requirements.txt
    # Configure LLM API key in .env
    uvicorn main:app --reload

> Each zone runs as an independent service and communicates over REST APIs — the AI engine and backend gateway can be developed, tested, and deployed separately.

## Team & Contributions

| Team Member | Zone | Contribution |
|---|---|---|
| **Daniel Mwariri** | Frontend (Zone 1) | Built the React.js PWA — camera/gallery hardware integration, asynchronous state management (loading states), and the interactive diagnostic dashboard, chat UI, and map view. |
| **Farid** | Backend Gateway & Database (Zone 2) | Built the Flask REST API gateway — user authentication, request routing to the AI engine, diagnosis history logging (PostgreSQL/Psycopg2), and Google Maps API integration for agrovet lookup. |
| **Meshack Mutunga** | AI Intelligence Engine (Zone 3) | Built the fully decoupled AI pipeline (FastAPI) — image preprocessing, MobileNetV2-based disease classification, OpenCV-based severity scoring via HSV color masking, Grad-CAM explainability heatmaps, and LLM integration for treatment advice. |

Live demo: [agrovision-rouge.vercel.app](https://agrovision-rouge.vercel.app)
