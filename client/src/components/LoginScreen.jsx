import loginLogo from '../assets/login-logo.png'

function LoginScreen() {
  return (
    <div id="loginScreen" className="login-screen">
      <div className="login-orb login-orb-a"></div>
      <div className="login-orb login-orb-b"></div>
      <div className="login-box">
        <div className="login-badge-wrap">
          <img className="login-badge-logo" src={loginLogo} alt="Cabinet Walid Araqi" />
        </div>
        <h2><i className="fa-solid fa-gavel"></i> Cabinet Walid Araqi</h2>
        <p className="login-subtitle">Plateforme sécurisée de gestion des dossiers</p>

        <label className="login-label" htmlFor="username">Nom d&apos;utilisateur</label>
        <div className="login-input-wrap">
          <i className="fa-regular fa-user"></i>
          <input type="text" id="username" placeholder="Entrer votre utilisateur" />
        </div>

        <label className="login-label" htmlFor="password">Mot de passe</label>
        <div className="login-input-wrap">
          <i className="fa-solid fa-key"></i>
          <input type="password" id="password" placeholder="Entrer votre mot de passe" />
        </div>

        <button id="loginBtn" className="btn-success login-submit">Se connecter</button>
        <p id="loginBootstrapHint" className="login-subtitle" style={{ display: 'none' }}></p>
        <button id="bootstrapSetupBtn" className="btn-primary login-submit" type="button" style={{ display: 'none' }}>Configurer le compte gestionnaire</button>
        <p id="errorMsg" className="error-msg">Nom d&apos;utilisateur ou mot de passe incorrect</p>
      </div>
    </div>
  )
}

export default LoginScreen
