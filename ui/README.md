# Denny Way Traffic

Shows the history of traffic on Denny Way

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

Run from the parent folder.

### Bare Metal Deployment

The built-in app server is production-ready.

Deploy the output of `npm run build`

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

Styling is done with [Tailwind CSS](https://tailwindcss.com/)
