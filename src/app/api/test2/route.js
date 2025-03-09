const { NextResponse } = require("next/server")


export async function GET(request) {
    return NextResponse.json({ message: 'GET request to /api/test2' });
  }