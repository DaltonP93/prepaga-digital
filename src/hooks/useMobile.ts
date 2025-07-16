import { useEffect, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { StatusBar, Style } from '@capacitor/status-bar';

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);

  useEffect(() => {
    checkMobileEnvironment();
    setupNetworkListener();
    setupStatusBar();
  }, []);

  const checkMobileEnvironment = async () => {
    try {
      const info = await Device.getInfo();
      setDeviceInfo(info);
      setIsMobile(info.platform !== 'web');
    } catch (error) {
      console.error('Error checking device info:', error);
      setIsMobile(false);
    }
  };

  const setupNetworkListener = async () => {
    try {
      const status = await Network.getStatus();
      setNetworkStatus(status);

      Network.addListener('networkStatusChange', (status) => {
        setNetworkStatus(status);
      });
    } catch (error) {
      console.error('Error setting up network listener:', error);
    }
  };

  const setupStatusBar = async () => {
    try {
      if (isMobile) {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
      }
    } catch (error) {
      console.error('Error setting up status bar:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      return photo.webPath;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  };

  const selectPhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      return photo.webPath;
    } catch (error) {
      console.error('Error selecting photo:', error);
      throw error;
    }
  };

  const shareContent = async (title: string, text: string, url?: string) => {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Compartir'
      });
    } catch (error) {
      console.error('Error sharing content:', error);
      throw error;
    }
  };

  const vibrate = async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      if (isMobile) {
        await Haptics.impact({ style });
      }
    } catch (error) {
      console.error('Error with haptics:', error);
    }
  };

  const getCurrentPosition = async () => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  };

  const requestPermissions = async () => {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  };

  return {
    isMobile,
    deviceInfo,
    networkStatus,
    takePhoto,
    selectPhoto,
    shareContent,
    vibrate,
    getCurrentPosition,
    requestPermissions
  };
};