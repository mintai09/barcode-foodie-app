import React from 'react';
import '../styles/Header.css';

function Header({ currentScreen, onLogoClick, onChangeProfile }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1
          className="app-title"
          onClick={onLogoClick}
          style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
          role="button"
          tabIndex={onLogoClick ? 0 : -1}
          aria-label="들리는 바코드 푸디 홈으로 이동"
        >
          <span className="logo-icon">🛒🎤</span>
          <span className="logo-text">들리는 바코드 푸디</span>
        </h1>

        {onChangeProfile && (
          <button
            className="change-profile-btn"
            onClick={onChangeProfile}
            aria-label="알레르기 프로필 변경"
          >
            <span>⚙️</span> 프로필 변경
          </button>
        )}
      </div>

      <div className="header-subtitle">
        시각장애인과 알레르기 환자를 위한 AI 식품 안전 비서
      </div>
    </header>
  );
}

export default Header;
