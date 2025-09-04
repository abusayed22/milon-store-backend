import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// This is a higher-order function that takes the required roles
// and returns a middleware function.
export function withRoleAuthorization(allowedRoles) {
  return function(handler) {
    return async function(req, { params }) {
      try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Check if the user's role is included in the allowed roles
        if (!decoded.role || !allowedRoles.includes(decoded.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // If authorized, proceed to the actual API route handler
        return handler(req, { params },decoded);

      } catch (error) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
    };
  };
}