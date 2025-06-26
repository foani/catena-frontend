import Layout from "./Layout.jsx";

import Game from "./Game";

import Ranking from "./Ranking";

import Airdrop from "./Airdrop";

import Profile from "./Profile";

import Mission from "./Mission";

import Multiplayer from "./Multiplayer";

import Admin from "./Admin";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Game: Game,
    
    Ranking: Ranking,
    
    Airdrop: Airdrop,
    
    Profile: Profile,
    
    Mission: Mission,
    
    Multiplayer: Multiplayer,
    
    Admin: Admin,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Game />} />
                
                
                <Route path="/Game" element={<Game />} />
                
                <Route path="/Ranking" element={<Ranking />} />
                
                <Route path="/Airdrop" element={<Airdrop />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/Mission" element={<Mission />} />
                
                <Route path="/Multiplayer" element={<Multiplayer />} />
                
                <Route path="/Admin" element={<Admin />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}