import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent เรียก AppRegistry.registerComponent('main', () => App)
// และตั้งค่า environment ให้เหมาะสมทั้งบน Expo Go และ native build
registerRootComponent(App);
