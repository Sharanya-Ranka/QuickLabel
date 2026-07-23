
// export default App
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';


// 1. Point Amplify to your newly created Cognito Pool
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_Y1sBfCf1r',       // Your Pool ID
      userPoolClientId: '21vufs31733qum04vh88v8t9kt', // Your App Client ID

      // 👇 REQUIRED FOR GOOGLE SIGN-IN
      loginWith: {
        email: true,
        oauth: {
          domain: 'us-east-1y1sbfcf1r.auth.us-east-1.amazoncognito.com', 
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['https://main.d1cwi5hq26s827.amplifyapp.com/', 'http://localhost:5173/'],
          redirectSignOut: ['https://main.d1cwi5hq26s827.amplifyapp.com/', 'http://localhost:5173/'],
          responseType: 'code', // 'code' is highly recommended for security over 'token'
          // prompt: 'select_account'
        }
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
    }
  }
});


import  { useState, useEffect } from 'react';
import { signInWithRedirect, getCurrentUser } from 'aws-amplify/auth';

export default function SignInComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuthVisualState() {
      try {
        // Passive profile check: reads local storage instantly without network traffic
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch (error) {
        // User footprint does not exist in browser storage
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuthVisualState();
  }, []);

  const handleSignIn = async () => {
    try {
      // Trigger the programmatic federated Google authentication loop
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Failed to initiate Google OAuth redirect:', error);
      // TODO: Better handling of these errors
      alert(`Failed to authenticate or User already signed in, Please refresh the page`);
    }
  };

  // Prevent UI flashing while checking local storage
  if (loading) {
    return null; 
  }

  // If the user already exists, render absolutely nothing
  if (isAuthenticated) {
    return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      Signed In
    </div>
  );
  }

  // Otherwise, render the single clean sign-in button
  return (
    <button 
      onClick={handleSignIn} 
      style={{
        padding: '10px 20px', 
        backgroundColor: '#4285F4', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        fontWeight: '500',
        cursor: 'pointer'
      }}
    >
      Sign In
    </button>
  );
}