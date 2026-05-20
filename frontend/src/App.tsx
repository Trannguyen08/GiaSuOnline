import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/layout/Header/Header';
import Footer from './components/layout/Footer/Footer';
import Login from './pages/Auth/Login';
import StudentRegister from './pages/Auth/StudentRegister';
import TutorRegister from './pages/Auth/TutorRegister';
import VerifyOTP from './pages/Auth/VerifyOTP';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './components/ui/Toast';

import Home from './pages/Home';
import FindTutors from './pages/FindTutors';
import TutorDetail from './pages/TutorDetail';
import TutorLayout from './components/layout/TutorLayout';
import TutorDashboard from './pages/TutorDashboard';
import TutorSchedule from './pages/TutorSchedule';
import TutorStudents from './pages/TutorStudents';
import TutorSettings from './pages/TutorSettings';
import TutorRooms from './pages/TutorRooms';
import StudyRooms from './pages/StudyRooms';

// Course Pages
import MyCourses from './pages/MyCourses';
import CourseDetail from './pages/CourseDetail';
import { TutorCourseList, TutorCourseDetail } from './pages/TutorCourseManagement';

// Admin Pages
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import TutorManagement from './pages/Admin/TutorManagement';
import UserManagement from './pages/Admin/UserManagement';

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <ToastProvider>
        <div className="flex flex-col min-h-screen bg-white">
          <Routes>
            {/* Main Layout Pages */}
            <Route element={<><Header /><main className="flex-1 flex flex-col"><Outlet /></main><Footer /></>}>
              <Route path="/" element={<Home />} />
              <Route path="/find-tutors" element={<FindTutors />} />
              <Route path="/tutor/:id" element={<TutorDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register/student" element={<StudentRegister />} />
              <Route path="/register/tutor" element={<TutorRegister />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />

              {/* Student Course Pages */}
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/my-courses/:id" element={<CourseDetail />} />
              <Route path="/study-rooms" element={<StudyRooms />} />
            </Route>

            {/* Tutor Portal Pages (Custom Layout) */}
            <Route path="/tutor" element={<TutorLayout />}>
              <Route path="dashboard" element={<TutorDashboard />} />
              <Route path="schedule" element={<TutorSchedule />} />
              <Route path="students" element={<TutorStudents />} />
              <Route path="rooms" element={<TutorRooms />} />
              <Route path="settings" element={<TutorSettings />} />
              <Route path="courses" element={<TutorCourseList />} />
              <Route path="courses/:id" element={<TutorCourseDetail />} />
            </Route>

            {/* Admin Portal Pages */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="tutor-approvals" element={<TutorManagement mode="approval" />} />
              <Route path="tutors" element={<TutorManagement mode="management" />} />
              <Route path="users" element={<UserManagement />} />
              <Route index element={<AdminDashboard />} />
            </Route>
          </Routes>
        </div>
        </ToastProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
