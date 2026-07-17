import './App.css'
import MainPage from './pages/MainPagev3'

function App() {

  return (
    <>
    <MainPage />
    </>
  )
}

export default App

// import { Amplify } from 'aws-amplify';
// import '@aws-amplify/ui-react/styles.css';
// import { signInWithRedirect } from 'aws-amplify/auth';


// // 1. Point Amplify to your newly created Cognito Pool
// Amplify.configure({
//   Auth: {
//     Cognito: {
//       userPoolId: 'us-east-1_Y1sBfCf1r',       // Your Pool ID
//       userPoolClientId: '21vufs31733qum04vh88v8t9kt', // Your App Client ID

//       // 👇 REQUIRED FOR GOOGLE SIGN-IN
//       loginWith: {
//         email: true,
//         oauth: {
//           domain: 'us-east-1y1sbfcf1r.auth.us-east-1.amazoncognito.com', 
//           scopes: ['openid', 'email', 'profile'],
//           redirectSignIn: ['http://localhost:5173/'],
//           redirectSignOut: ['http://localhost:5173/'],
//           responseType: 'code', // 'code' is highly recommended for security over 'token'
//           // prompt: 'select_account'
//         }
//       },
//       signUpVerificationMethod: 'code',
//       userAttributes: {
//         email: {
//           required: true,
//         },
//       },
//     }
//   }
// });

// import { useState, useEffect } from 'react';
// import { signOut, getCurrentUser } from 'aws-amplify/auth';
// import type { AuthUser } from 'aws-amplify/auth';

// function GoogleSignInButton() {
//   const [user, setUser] = useState<AuthUser|null>(null);
//   const [loading, setLoading] = useState(true);

//   // Check if a user session already exists when the component loads
//   useEffect(() => {
//     async function checkUser() {
//       try {
//         const currentUser = await getCurrentUser();
//         setUser(currentUser);
//       } catch (error) {
//         // getCurrentUser throws an error if no user is signed in, which is expected
//         setUser(null);
//       } finally {
//         setLoading(false);
//       }
//     }
//     checkUser();
//   }, []);

//   const handleAuthAction = async () => {
//     try {
//       if (user) {
//         // If a user exists, sign them out
//         await signOut({ global: true });
//         setUser(null); 
//       } else {
//         // If no user exists, hand off to Google's OAuth portal
//         await signInWithRedirect({ provider: 'Google' });
        
//       }
//     } catch (error) {
//       console.error('Authentication action failed:', error);
//     }
//   };

//   if (loading) {
//     return <button disabled style={{ padding: '10px 20px', borderRadius: '4px' }}>Loading...</button>;
//   }

//   console.log("User", user)

//   return (
//     <button 
//       onClick={handleAuthAction} 
//       style={{
//         padding: '10px 20px', 
//         backgroundColor: user ? '#DB4437' : '#4285F4', // Red for Sign Out, Blue for Sign In
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px',
//         cursor: 'pointer'
//       }}
//     >
//       {user ? 'Sign Out' : 'Sign In with Google'}
//     </button>
//   );
// }

// // 4. Wrap the UI inside the Authenticator provider.
// // This instantly generates an out-of-the-box Sign In / Sign Up UI interface.
// function App() {
//   return (
//     <GoogleSignInButton />
//     // <Authenticator socialProviders={['google']}>
//     //   {({ signOut, user }) => (
//     //     <main>
//     //       <h1>Hello {user!.username}!</h1>
//     //       <EmbeddingDashboard />
//     //       <button onClick={signOut} style={{ marginTop: '20px' }}>Sign Out</button>
//     //     </main>
//     //   )}
//     // </Authenticator>
//   );
// }

// export default App
