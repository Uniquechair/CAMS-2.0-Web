import React, { Suspense } from 'react';
import Navbar from '../../../Component/Navbar/navbar';
import Footer from '../../../Component/Footer/footer';
import { AuthProvider } from '../../../Component/AuthContext/AuthContext';
import './Profile.css';

const FrontUserProfile = React.lazy(() =>
  import('../../../Component/FrontUserProfile/FrontUserProfile')
);

const Profile = () => {
  return (
    <div>
      <div className="Front_Profile_Main_Container">
        <AuthProvider>
          <Navbar />

          <Suspense
            fallback={
              <div
                style={{
                  minHeight: '60vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#806853'
                }}
              >
                Loading profile...
              </div>
            }
          >
            <FrontUserProfile />
          </Suspense>

          <Footer />
        </AuthProvider>
      </div>
    </div>
  );
};

export default Profile;