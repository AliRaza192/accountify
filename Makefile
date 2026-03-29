.PHONY: install dev build clean

install:
	@echo "Installing backend dependencies..."
	cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installation complete!"

dev:
	@echo "Starting backend server on port 8000..."
	cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
	@echo "Starting frontend server on port 3000..."
	cd frontend && npm run dev
	@echo "Development servers running!"

build:
	@echo "Building frontend for production..."
	cd frontend && npm run build
	@echo "Build complete!"

clean:
	@echo "Cleaning up..."
	rm -rf backend/__pycache__
	rm -rf backend/app/__pycache__
	rm -rf frontend/.next
	rm -rf frontend/node_modules
	rm -rf backend/venv
	@echo "Cleanup complete!"
