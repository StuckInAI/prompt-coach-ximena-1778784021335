import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Library, Settings, ChevronLeft, ChevronRight, LogOut, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import styles from './DashboardLayout.module.css';
import { usePromptStore } from '@/hooks/usePromptStore';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { preferences } = usePromptStore();
  const { reopen } = useOnboarding();
  const navigate = useNavigate();

  const initials = preferences.displayName.trim().slice(0, 2).toUpperCase() || 'PC';

  return (
    <div className={styles.shell}>
      <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
        <div className={styles.brand}>
          <div className={styles.logo}><Sparkles size={18} /></div>
          {!collapsed && <span className={styles.brandName}>PromptCoach</span>}
        </div>
        <nav className={styles.nav}>
          <NavLink to="/dashboard/editor" className={({ isActive }) => clsx(styles.navItem, isActive && styles.navItemActive)}>
            <FileText size={16} />
            {!collapsed && <span>Editor</span>}
          </NavLink>
          <NavLink to="/dashboard/library" className={({ isActive }) => clsx(styles.navItem, isActive && styles.navItemActive)}>
            <Library size={16} />
            {!collapsed && <span>Library</span>}
          </NavLink>
          <NavLink to="/dashboard/settings" className={({ isActive }) => clsx(styles.navItem, isActive && styles.navItemActive)}>
            <Settings size={16} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </nav>
        <div className={styles.sidebarFoot}>
          <button className={styles.iconButton} onClick={reopen} title="Replay onboarding">
            <HelpCircle size={16} />
            {!collapsed && <span>Help</span>}
          </button>
          <button className={styles.iconButton} onClick={() => setCollapsed((c) => !c)} title="Toggle sidebar">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={styles.topbarHint}>All data is stored locally in your browser.</span>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.avatar} title={preferences.displayName}>{initials}</div>
            <button className={styles.logout} onClick={() => navigate('/')} title="Exit to landing">
              <LogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
