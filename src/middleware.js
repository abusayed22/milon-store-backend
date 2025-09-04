// import { NextResponse } from "next/server";


// export function middleware() {
//     // retrieve the current response
//     const res = NextResponse.next()

//     // add the CORS headers to the response
//     res.headers.append('Access-Control-Allow-Credentials', "true")
//     res.headers.append('Access-Control-Allow-Origin', '*') // replace this your actual origin
//     res.headers.append('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT')
//     res.headers.append(
//         'Access-Control-Allow-Headers',
//         'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
//     )

//     return res
// }

// // specify the path regex to apply the middleware to
// export const config = {
//     matcher: '/api/:path*',
// }











import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// 1. Specify public routes that don't require authentication
const publicRoutes = ['/api/auth/login', '/api/auth/register','/api/auth/forget-password','/api/auth/reset-password'];

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  console.log(path)

  // 2. Create a response object to attach headers
  const response = NextResponse.next();

  // 3. Add CORS headers to every response
  response.headers.append('Access-Control-Allow-Credentials', "true");
  response.headers.append('Access-Control-Allow-Origin', '*'); // Or your specific frontend origin
  response.headers.append('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  response.headers.append('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: response.headers, status: 204 });
  }

  // 4. If it's a public route, let the request pass through with CORS headers
  if (isPublicRoute) {
    return response;
  }

  // 5. For protected routes, verify the JWT
  const authHeader = req.headers.get('authorization');
  console.log(authHeader)
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...response.headers.entries() } }
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    // Token is valid, allow the request to proceed
    return response;
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...response.headers.entries() } }
    );
  }
}

// 6. Specify which paths the middleware should run on
export const config = {
  matcher: '/api/:path*',
};