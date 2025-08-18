import { DayOfWeek, DayPicker } from '@components/DayPicker';
import { LocalSubscriptionModal } from '@components/LocalSubscriptionModal';
import { PaywallModal } from '@components/PaywallModal';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faClock,
  faExternalLinkAlt,
  faHeart,
  faLocationArrow,
  faLocationDot,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faPhone,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  apiStore,
  authStore,
  favoriteStore,
  mapStore,
  showStore,
  subscriptionStore,
} from '@stores/index';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';

export const MapComponent: React.FC = observer(() => {
  const theme = useTheme();
  const showListRef = useRef<HTMLDivElement>(null);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLocalSubscription, setShowLocalSubscription] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<
    'favorites' | 'ad_removal' | 'music_preview'
  >('favorites');
  const [pendingFavoriteAction, setPendingFavoriteAction] = useState<{
    showId: string;
    day: string;
    action: 'add' | 'remove';
  } | null>(null);

  // Login modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Google Maps API key from server config
  const API_KEY = apiStore.googleMapsApiKey;

  // Add a state to track if we should show the config loading
  const [showConfigLoading, setShowConfigLoading] = useState(true);

  // Hide config loading after a short delay to prevent flash
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfigLoading(false);
    }, 2000); // Give config 2 seconds to load, then show map anyway

    if (apiStore.configLoaded) {
      clearTimeout(timer);
      setShowConfigLoading(false);
    }

    return () => clearTimeout(timer);
  }, [apiStore.configLoaded]);

  // Initialize stores when component mounts - this will only run once per component lifecycle
  React.useEffect(() => {
    const initializeStores = async () => {
      if (!mapStore.isInitialized) {
        await mapStore.initialize().catch((error) => {
          console.error('Failed to initialize map store:', error);
        });
      }

      // Fetch shows for the current selected day
      if (showStore.shows.length === 0 && !showStore.isLoading) {
        await showStore.fetchShows(showStore.selectedDay).catch((error) => {
          console.error('Failed to fetch shows:', error);
        });
      }

      // Fetch favorites if user is authenticated
      if (
        authStore.isAuthenticated &&
        favoriteStore.favorites.length === 0 &&
        !favoriteStore.isLoading
      ) {
        await favoriteStore.fetchMyFavorites().catch((error) => {
          console.error('Failed to fetch favorites:', error);
        });
      }
    };

    initializeStores();
  }, []); // Empty dependency array means this runs once on mount

  // Watch for subscription changes and execute pending actions
  React.useEffect(() => {
    if (pendingFavoriteAction && subscriptionStore.isSubscribed) {
      const executePendingAction = async () => {
        const { showId, day, action } = pendingFavoriteAction;

        if (action === 'add') {
          const result = await favoriteStore.addFavorite({ showId, day });
          if (!result.success) {
            console.error('Failed to add favorite after subscription:', result.error);
          }
        } else if (action === 'remove') {
          const result = await favoriteStore.removeFavoriteByShow(showId);
          if (!result.success) {
            console.error('Failed to remove favorite after subscription:', result.error);
          }
        }

        setPendingFavoriteAction(null);
        setShowPaywall(false);
      };

      executePendingAction();
    }
  }, [subscriptionStore.isSubscribed, pendingFavoriteAction]);

  // Favorite handling functions
  const handleFavorite = async (showId: string, day: string) => {
    if (!authStore.isAuthenticated) {
      // Show local subscription modal for unauthenticated users
      setPaywallFeature('favorites');
      setShowLocalSubscription(true);
      return;
    }

    // Check if paywall should be shown
    if (subscriptionStore.shouldShowPaywall('favorites')) {
      setPendingFavoriteAction({ showId, day, action: 'add' });
      setPaywallFeature('favorites');
      setShowPaywall(true);
      return;
    }

    // User has access, add favorite directly
    const result = await favoriteStore.addFavorite({ showId, day });
    if (!result.success) {
      console.error('Failed to add favorite:', result.error);
    }
  };

  const handleUnfavorite = async (showId: string, day: string) => {
    if (!authStore.isAuthenticated) {
      // Show local subscription modal for unauthenticated users
      setPaywallFeature('favorites');
      setShowLocalSubscription(true);
      return;
    }

    // Check if paywall should be shown
    if (subscriptionStore.shouldShowPaywall('favorites')) {
      setPendingFavoriteAction({ showId, day, action: 'remove' });
      setPaywallFeature('favorites');
      setShowPaywall(true);
      return;
    }

    // User has access, remove favorite directly
    const result = await favoriteStore.removeFavoriteByShow(showId);
    if (!result.success) {
      console.error('Failed to remove favorite:', result.error);
    }
  };

  const handlePaywallClose = () => {
    setShowPaywall(false);
    setPendingFavoriteAction(null);
  };

  if (showConfigLoading && !apiStore.configLoaded && !API_KEY) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading configuration...</Typography>
      </Box>
    );
  }

  if (!API_KEY && !showConfigLoading) {
    console.error('Google Maps API key not found in server configuration');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Maps functionality may be limited. Please refresh the page if the map doesn't load.
        </Alert>
      </Box>
    );
  }

  const handleDayChange = (day: DayOfWeek) => {
    showStore.setSelectedDay(day);
    // Fetch shows for the new day
    showStore.fetchShows(day).catch((error) => {
      console.error('Failed to fetch shows for day:', day, error);
    });
  };

  const handleMarkerClick = (show: any) => {
    mapStore.handleMarkerClick(show);

    // Scroll to show in list
    if (showListRef.current) {
      const showElement = showListRef.current.querySelector(`[data-show-id="${show.id}"]`);
      if (showElement) {
        showElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleShowClick = (show: any) => {
    mapStore.panToShow(show);
  };

  // MapContent component that has access to the map instance
  const MapContent: React.FC<{
    theme: any;
    handleMarkerClick: (show: any) => void;
    formatTime: (time: string) => string;
    onMapLoad: (map: google.maps.Map) => void;
  }> = observer(({ theme, handleMarkerClick, formatTime, onMapLoad }) => {
    const map = useMap();

    // Call onMapLoad immediately when map is available
    if (map && onMapLoad) {
      onMapLoad(map);
    }

    // Enhanced fullscreen detection with custom controls
    useEffect(() => {
      if (!map) return;

      console.log('Map instance available, setting up fullscreen detection');

      // Create custom control for fullscreen show list
      const createShowListControl = () => {
        const controlDiv = document.createElement('div');
        controlDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 400px;
          z-index: 2147483647;
          pointer-events: auto;
          background: transparent;
          transition: transform 0.3s ease-in-out;
          transform: translateX(0);
          display: none;
        `;
        controlDiv.id = 'fullscreen-show-list';

        // Create toggle button container
        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = `
          position: absolute;
          right: -16px;
          top: 50%;
          transform: translateY(-50%);
          background: ${theme.palette.background.paper};
          border: 1px solid ${theme.palette.divider};
          border-left: none;
          border-radius: 0 6px 6px 0;
          box-shadow: 2px 0 8px rgba(0,0,0,0.3);
          cursor: pointer;
          padding: 8px 4px;
          z-index: 2147483648;
          transition: all 0.2s ease;
        `;

        // Create toggle button
        const toggleButton = document.createElement('div');
        toggleButton.style.cssText = `
          color: ${theme.palette.primary.main};
          font-size: 20px;
          font-weight: bold;
          user-select: none;
          transition: transform 0.3s ease;
        `;
        toggleButton.innerHTML = '«';

        // State for panel (starts open)
        let isOpen = true;

        // Make toggle state accessible globally for show clicks
        (window as any).fullscreenPanelState = {
          isOpen: true,
          toggleButton: null,
          controlDiv: null,
        };

        // Toggle functionality
        const togglePanel = () => {
          isOpen = !isOpen;
          (window as any).fullscreenPanelState.isOpen = isOpen;

          if (isOpen) {
            controlDiv.style.transform = 'translateX(0)';
            toggleButton.innerHTML = '«';
          } else {
            controlDiv.style.transform = 'translateX(-100%)';
            toggleButton.innerHTML = '»';
          }
        };

        toggleContainer.addEventListener('click', togglePanel);
        toggleContainer.appendChild(toggleButton);

        // Create content panel
        const contentPanel = document.createElement('div');
        contentPanel.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 400px;
          background: ${theme.palette.background.paper};
          border-right: 1px solid ${theme.palette.divider};
          box-shadow: 2px 0 20px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `;

        // Create header with count
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
          background: ${theme.palette.background.paper};
          color: ${theme.palette.text.primary};
          padding: 16px;
          font-family: Roboto, sans-serif;
          border-bottom: 1px solid ${theme.palette.divider};
        `;

        // Create title
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;`;
        titleDiv.textContent = `Shows for ${showStore.selectedDay}`;

        // Create count
        const countDiv = document.createElement('div');
        countDiv.style.cssText = `font-size: 0.875rem; color: ${theme.palette.text.secondary};`;
        countDiv.textContent = `${showStore.showsForSelectedDay.length} show(s) found`;

        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(countDiv);

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `
          flex: 1;
          overflow-y: auto;
          padding: 0;
          margin: 5px;
          padding-right: 10px;
          /* Custom scrollbar styling */
          &::-webkit-scrollbar {
            width: 8px;
          }
          &::-webkit-scrollbar-track {
            background: ${theme.palette.action.hover};
            border-radius: 4px;
          }
          &::-webkit-scrollbar-thumb {
            background: ${theme.palette.primary.main};
            border-radius: 4px;
          }
          &::-webkit-scrollbar-thumb:hover {
            background: ${theme.palette.primary.dark};
          }
        `;
        contentDiv.id = 'fullscreen-show-content';

        // Assemble the structure
        contentPanel.appendChild(headerDiv);
        contentPanel.appendChild(contentDiv);
        controlDiv.appendChild(contentPanel);
        controlDiv.appendChild(toggleContainer);

        // Store references for global access
        (window as any).fullscreenPanelState.toggleButton = toggleButton;
        (window as any).fullscreenPanelState.controlDiv = controlDiv;

        // Add global event listener to prevent panel from being hidden by any external clicks
        const preventPanelHiding = (event: Event) => {
          const panel = document.getElementById('fullscreen-show-list');
          const panelState = (window as any).fullscreenPanelState;

          // If clicking within the panel, ensure it stays open
          if (panel && panelState && event.target) {
            const target = event.target as HTMLElement;
            if (panel.contains(target)) {
              console.log('Click within panel detected, ensuring panel stays open');
              setTimeout(() => {
                if (panelState.isOpen) {
                  panel.style.display = 'block';
                  panel.style.transform = 'translateX(0)';
                }
              }, 10);
            }
          }
        };

        // Attach the listener to the control div
        controlDiv.addEventListener('click', preventPanelHiding);
        controlDiv.addEventListener('mousedown', preventPanelHiding);

        return controlDiv;
      };

      const showListControl = createShowListControl();

      // Function to update the control content
      const updateShowListControl = () => {
        const contentDiv = document.getElementById('fullscreen-show-content');
        if (!contentDiv) return;

        if (showStore.isLoading) {
          contentDiv.innerHTML = `
            <div style="display: flex; justify-content: center; padding: 40px;">
              <div style="width: 24px; height: 24px; border: 3px solid ${theme.palette.action.disabled}; border-top: 3px solid ${theme.palette.primary.main}; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
            <style>
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          `;
        } else if (showStore.showsForSelectedDay.length === 0) {
          contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: ${theme.palette.text.secondary}; font-family: Roboto, sans-serif;">
              No shows found for ${showStore.selectedDay}
            </div>
          `;
        } else {
          contentDiv.innerHTML = showStore.showsForSelectedDay
            .map(
              (show) => `
            <div style="
              padding: 0;
              margin: 0 6px 12px 6px;
            ">
              <div style="
                padding: 20px;
                border-radius: 8px;
                transition: all 0.2s ease;
                border: 1px solid ${theme.palette.divider};
                background: ${theme.palette.background.paper};
                cursor: pointer;
                position: relative;
                ${
                  showStore.selectedShow?.id === show.id
                    ? `
                  background: ${theme.palette.primary.main}15;
                  border: 2px solid ${theme.palette.primary.main};
                `
                    : ''
                }
              " onclick="event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); console.log('Show card clicked:', '${show.id}'); window.mapComponentHandleShowClick && window.mapComponentHandleShowClick('${show.id}'); return false;" 
                 onmouseover="
                   this.style.backgroundColor='${theme.palette.action.hover}';
                   this.style.border='1px solid ${theme.palette.primary.main}';
                   this.style.transform='translateY(-2px)';
                   this.style.boxShadow='0 4px 8px rgba(0,0,0,0.12)';
                 " 
                 onmouseout="
                   this.style.backgroundColor='${showStore.selectedShow?.id === show.id ? theme.palette.primary.main + '15' : theme.palette.background.paper}';
                   this.style.border='${showStore.selectedShow?.id === show.id ? '2px solid ' + theme.palette.primary.main : '1px solid ' + theme.palette.divider}';
                   this.style.transform='translateY(0)';
                   this.style.boxShadow='none';
                 ">
                
                <!-- Heart icon (favorite) - top right -->
                <div style="
                  position: absolute;
                  top: 16px;
                  right: 16px;
                  color: ${theme.palette.text.secondary};
                  font-size: 20px;
                  cursor: pointer;
                ">♡</div>
                
                <!-- Main content layout -->
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <!-- Icon column with microphone and vertical line -->
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 24px;">
                    <div style="
                      color: ${theme.palette.primary.main};
                      font-size: 16px;
                      background: ${theme.palette.primary.main}20;
                      width: 32px;
                      height: 32px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">🎤</div>
                    <div style="
                      width: 2px;
                      height: 40px;
                      background: linear-gradient(to bottom, ${theme.palette.primary.main}, transparent);
                      border-radius: 1px;
                    "></div>
                  </div>
                  
                  <!-- Main content -->
                  <div style="flex: 1; min-width: 0;">
                    <!-- Venue name -->
                    <div style="
                      font-weight: 600;
                      margin-bottom: 8px;
                      font-size: 1.25rem;
                      line-height: 1.2;
                      color: ${theme.palette.text.primary};
                      font-family: Roboto, sans-serif;
                    ">
                      ${show.venue || show.vendor?.name || 'Unknown Venue'}
                    </div>
                    
                    ${
                      show.startTime
                        ? `
                    <!-- Time with clock icon -->
                    <div style="
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      margin-bottom: 8px;
                      background: ${theme.palette.primary.main}15;
                      padding: 4px 8px;
                      border-radius: 12px;
                      width: fit-content;
                    ">
                      <div style="color: ${theme.palette.primary.main}; font-size: 12px;">�</div>
                      <div style="
                        font-weight: 600;
                        font-size: 0.875rem;
                        color: ${theme.palette.primary.main};
                        font-family: Roboto, sans-serif;
                      ">
                        ${formatTime(show.startTime)} - ${formatTime(show.endTime)}
                      </div>
                    </div>
                    `
                        : ''
                    }
                    
                    <!-- DJ/Host info with person icon -->
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                      <div style="color: ${theme.palette.text.secondary}; font-size: 14px;">👤</div>
                      <div style="
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: ${theme.palette.text.secondary};
                        font-family: Roboto, sans-serif;
                      ">
                        ${show.dj?.name || 'Unknown Host'}
                      </div>
                    </div>
                    
                    <!-- Location info with map pin icon -->
                    <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 12px;">
                      <div style="
                        color: ${theme.palette.text.secondary};
                        font-size: 14px;
                        margin-top: 1px;
                      ">📍</div>
                      <div style="
                        font-size: 0.875rem;
                        line-height: 1.3;
                        color: ${theme.palette.text.secondary};
                        font-family: Roboto, sans-serif;
                      ">
                        ${show.address}
                      </div>
                    </div>
                    
                    <!-- Tags section -->
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
                      ${
                        show.vendor?.name
                          ? `
                      <div style="
                        background: ${theme.palette.info.main}20;
                        color: ${theme.palette.info.main};
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 500;
                        font-family: Roboto, sans-serif;
                      ">${show.vendor.name}</div>
                      `
                          : ''
                      }
                      
                      <div style="
                        background: ${theme.palette.secondary.main}20;
                        color: ${theme.palette.secondary.main};
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 500;
                        font-family: Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      ">
                        <span>🎵</span>
                        Karaoke
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `,
            )
            .join('');
        }
      };

      // Add global handler for show clicks in fullscreen
      (window as any).mapComponentHandleShowClick = (showId: string) => {
        const show = showStore.showsForSelectedDay.find((s) => s.id === showId);
        if (show) {
          // Set selected show in store
          showStore.setSelectedShow(show);

          // Center map on show location with proper zoom
          if (mapStore.mapInstance) {
            const geocodedShow = mapStore.geocodedShows.find((s) => s.id === show.id);
            if (geocodedShow) {
              const location = { lat: geocodedShow.lat, lng: geocodedShow.lng };

              // Use setCenter and setZoom for immediate centering
              mapStore.mapInstance.setCenter(location);
              mapStore.mapInstance.setZoom(16);

              // Update selected marker using the proper method
              mapStore.handleMarkerClick(show);
            }
          }

          // Function to ensure panel stays open
          const ensurePanelOpen = () => {
            const panelState = (window as any).fullscreenPanelState;
            const panel = document.getElementById('fullscreen-show-list');

            if (panel && panelState) {
              // Force panel to be visible and in correct position
              panel.style.display = 'block !important';
              panel.style.visibility = 'visible !important';
              panel.style.transform = 'translateX(0) !important';
              panel.style.opacity = '1 !important';

              // Update toggle button state
              if (panelState.toggleButton) {
                panelState.toggleButton.innerHTML = '«';
              }

              // Force state to open
              panelState.isOpen = true;

              console.log('Panel forcefully ensured open after show click');
            } else {
              console.log('Panel or panelState not found:', {
                panel: !!panel,
                panelState: !!panelState,
              });
            }
          };

          // Ensure panel stays open immediately and after multiple delays
          ensurePanelOpen();
          setTimeout(ensurePanelOpen, 10);
          setTimeout(ensurePanelOpen, 50);
          setTimeout(ensurePanelOpen, 100);
          setTimeout(ensurePanelOpen, 200);
          setTimeout(ensurePanelOpen, 500);

          // Update the fullscreen show list to reflect selection
          updateShowListControl();
        }
      };

      const fullscreenChangeHandler = () => {
        const isFullscreen = !!document.fullscreenElement;
        console.log('Fullscreen changed:', isFullscreen);
        console.log('Document fullscreen element:', document.fullscreenElement);
        console.log('isMapFullscreen:', isFullscreen);

        if (isFullscreen) {
          // Add controls to map when entering fullscreen
          // First try the fullscreen element, then fallback to map container
          const fullscreenElement = document.fullscreenElement as HTMLElement;
          const mapDiv =
            fullscreenElement || (document.querySelector('#map-container') as HTMLElement);

          console.log('🎯 Attempting to add controls to:', mapDiv);

          if (mapDiv) {
            // Add show list control
            if (!document.getElementById('fullscreen-show-list')) {
              mapDiv.appendChild(showListControl);
              updateShowListControl();
              showListControl.style.display = 'block';

              // Ensure panel starts in open position
              const panelState = (window as any).fullscreenPanelState;
              if (panelState && panelState.controlDiv) {
                panelState.controlDiv.style.transform = 'translateX(0)';
                if (panelState.toggleButton) {
                  panelState.toggleButton.innerHTML = '«';
                }
                panelState.isOpen = true;
              }

              console.log('✅ Added show list control to fullscreen element');
            } else {
              // Panel already exists, ensure it stays in correct state
              const panelState = (window as any).fullscreenPanelState;
              if (panelState && panelState.isOpen && panelState.controlDiv) {
                panelState.controlDiv.style.display = 'block';
                panelState.controlDiv.style.transform = 'translateX(0)';
              }
            }
          } else {
            console.log('❌ Could not find target element for controls');
          }
        } else {
          // Remove controls when exiting fullscreen
          const existingControl = document.getElementById('fullscreen-show-list');
          if (existingControl) {
            existingControl.remove();
          }
        }
      };

      document.addEventListener('fullscreenchange', fullscreenChangeHandler);

      // Also check initial state
      const initialState = !!document.fullscreenElement;
      console.log('Initial fullscreen state:', initialState);

      // Observe show store changes to update content
      const updateContent = () => {
        updateShowListControl();
        // Update header text
        const headerDiv = showListControl.querySelector('div') as HTMLDivElement;
        if (headerDiv) {
          const titleDiv = headerDiv.querySelector('div:first-child') as HTMLDivElement;
          const countDiv = headerDiv.querySelector('div:last-child') as HTMLDivElement;
          if (titleDiv) titleDiv.textContent = `Shows for ${showStore.selectedDay}`;
          if (countDiv)
            countDiv.textContent = `${showStore.showsForSelectedDay.length} show(s) found`;
        }
      };

      // Update content when store changes
      updateContent();

      return () => {
        document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
        // Clean up global handler
        delete (window as any).mapComponentHandleShowClick;
        // Clean up any remaining controls
        const existingControl = document.getElementById('fullscreen-show-list');
        if (existingControl) {
          existingControl.remove();
        }
        const existingButton = document.getElementById('fullscreen-show-button');
        if (existingButton) {
          existingButton.remove();
        }
      };
    }, [
      map,
      showStore.shows,
      showStore.selectedDay,
      showStore.isLoading,
      showStore.selectedShow,
      theme,
    ]);

    return (
      <>
        {/* User Location Marker */}
        {mapStore.userLocation && (
          <Marker
            position={mapStore.userLocation}
            icon={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <circle cx="12" cy="12" r="8" fill="${theme.palette.info.main}" stroke="#fff" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#fff"/>
            </svg>
          `)}`}
            title="Your Location"
          />
        )}

        {/* Show Markers with Microphone Icons */}
        {mapStore.geocodedShows.length > 0 && console.log('Total geocoded shows for rendering:', mapStore.geocodedShows.length)}
        {mapStore.geocodedShows.map((show: any) => {
          // Check for overlapping markers and add small offset
          const overlappingShows = mapStore.geocodedShows.filter(
            (otherShow: any) =>
              otherShow.id !== show.id &&
              Math.abs(otherShow.lat - show.lat) < 0.0001 &&
              Math.abs(otherShow.lng - show.lng) < 0.0001,
          );

          const offsetMultiplier = overlappingShows.filter((s) => s.id < show.id).length;
          const offset = offsetMultiplier * 0.0002; // Small offset for overlapping markers

          const position = {
            lat: show.lat + offset,
            lng: show.lng + offset,
          };

          console.log('Rendering marker for show:', {
            id: show.id,
            venue: show.venue,
            lat: show.lat,
            lng: show.lng,
            offsetPosition: position,
            overlappingCount: overlappingShows.length,
          });

          return (
            <Marker
              key={show.id}
              position={position}
              onClick={() => handleMarkerClick(show)}
              title={show.venue || show.vendor?.name || 'Karaoke Show'}
              icon={createMicrophoneIcon(mapStore.selectedMarkerId === show.id)}
            />
          );
        })()}

        {/* Info Window for Selected Show */}
        {mapStore.selectedMarkerId &&
          showStore.selectedShow &&
          (() => {
            const geocodedShow = mapStore.geocodedShows.find(
              (s) => s.id === mapStore.selectedMarkerId,
            );
            if (!geocodedShow) return null;

            return (
              <InfoWindow
                key={geocodedShow.id} // Add key to prevent re-creation
                position={{
                  lat: geocodedShow.lat,
                  lng: geocodedShow.lng,
                }}
                pixelOffset={[0, -40]} // Offset to avoid covering marker
                onCloseClick={() => {
                  mapStore.closeInfoWindow();
                }}
              >
                <Box
                  sx={{
                    maxWidth: { xs: '280px', sm: '320px' },
                    minWidth: { xs: '250px', sm: '280px' },
                    p: { xs: 1.5, sm: 2 },
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 2,
                    boxShadow: theme.shadows[8],
                    position: 'relative',
                    maxHeight: { xs: '320px', sm: 'auto' },
                    overflow: 'auto',
                    border: `1px solid ${theme.palette.divider}`,
                    // Custom scrollbar styling
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: theme.palette.action.hover,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: theme.palette.primary.main,
                      borderRadius: '2px',
                    },
                  }}
                >
                  {/* Close button in top right corner */}
                  <IconButton
                    size="small"
                    onClick={() => mapStore.closeInfoWindow()}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: theme.palette.text.secondary,
                      backgroundColor: theme.palette.background.default,
                      border: `1px solid ${theme.palette.divider}`,
                      width: 28,
                      height: 28,
                      '&:hover': {
                        color: theme.palette.text.primary,
                        backgroundColor: theme.palette.action.hover,
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s ease',
                      zIndex: 1,
                    }}
                  >
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: '12px' }} />
                  </IconButton>

                  {/* Title and heart in same row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        lineHeight: 1.2,
                        flex: 1,
                      }}
                    >
                      {showStore.selectedShow?.venue || showStore.selectedShow?.vendor?.name}
                    </Typography>

                    {/* Favorite button next to title */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        const selectedShow = showStore.selectedShow;
                        if (!selectedShow) return;

                        const isFav =
                          authStore.isAuthenticated && favoriteStore.isFavorite(selectedShow.id);
                        if (isFav) {
                          handleUnfavorite(selectedShow.id, showStore.selectedDay);
                        } else {
                          handleFavorite(selectedShow.id, showStore.selectedDay);
                        }
                      }}
                      sx={{
                        color:
                          authStore.isAuthenticated &&
                          showStore.selectedShow &&
                          favoriteStore.isFavorite(showStore.selectedShow.id)
                            ? theme.palette.error.main
                            : theme.palette.text.secondary,
                        '&:hover': {
                          color: theme.palette.error.main,
                          backgroundColor: theme.palette.error.main + '10',
                        },
                        p: 0.5,
                        opacity: authStore.isAuthenticated ? 1 : 0.6,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={
                          authStore.isAuthenticated &&
                          showStore.selectedShow &&
                          favoriteStore.isFavorite(showStore.selectedShow.id)
                            ? faHeart
                            : faHeartRegular
                        }
                        style={{ fontSize: '14px' }}
                      />
                    </IconButton>
                  </Box>
                  {showStore.selectedShow?.venue && showStore.selectedShow?.vendor?.name && (
                    <Typography
                      variant="body2"
                      gutterBottom
                      sx={{
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                        mb: 1,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      }}
                    >
                      by {showStore.selectedShow.vendor.name}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    gutterBottom
                    sx={{
                      color: theme.palette.text.secondary,
                      mb: 1.5,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      lineHeight: 1.3,
                    }}
                  >
                    {showStore.selectedShow?.address}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FontAwesomeIcon
                      icon={faMicrophone}
                      style={{
                        fontSize: '12px',
                        color: theme.palette.primary.main,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.primary,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      }}
                    >
                      Host: {showStore.selectedShow?.dj?.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      style={{
                        fontSize: '12px',
                        color: theme.palette.secondary.main,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                      {showStore.selectedShow?.startTime &&
                        formatTime(showStore.selectedShow.startTime)}{' '}
                      -{' '}
                      {showStore.selectedShow?.endTime &&
                        formatTime(showStore.selectedShow.endTime)}
                    </Typography>
                  </Box>

                  {/* Contact Information */}
                  {showStore.selectedShow?.venuePhone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FontAwesomeIcon
                        icon={faPhone}
                        style={{
                          fontSize: '12px',
                          color: theme.palette.success.main,
                        }}
                      />
                      <Typography
                        component="a"
                        href={`tel:${showStore.selectedShow.venuePhone}`}
                        variant="body2"
                        sx={{
                          color: theme.palette.text.primary,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          textDecoration: 'none',
                          '&:hover': {
                            color: theme.palette.success.main,
                          },
                        }}
                      >
                        {showStore.selectedShow.venuePhone}
                      </Typography>
                    </Box>
                  )}

                  {showStore.selectedShow?.venueWebsite && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FontAwesomeIcon
                        icon={faExternalLinkAlt}
                        style={{
                          fontSize: '12px',
                          color: theme.palette.info.main,
                        }}
                      />
                      <Typography
                        component="a"
                        href={
                          showStore.selectedShow.venueWebsite.startsWith('http')
                            ? showStore.selectedShow.venueWebsite
                            : `https://${showStore.selectedShow.venueWebsite}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{
                          color: theme.palette.info.main,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        Visit Website
                      </Typography>
                    </Box>
                  )}

                  {showStore.selectedShow?.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                      }}
                    >
                      {showStore.selectedShow.description}
                    </Typography>
                  )}
                </Box>
              </InfoWindow>
            );
          })()}
      </>
    );
  });

  // Create microphone marker icon
  const createMicrophoneIcon = (isSelected = false) => {
    const iconColor = isSelected ? '#d32f2f' : '#f44336'; // Red colors - darker when selected, lighter when not
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${iconColor}" stroke="#fff" stroke-width="2"/>
      <path d="M16 20c2.21 0 3.98-1.79 3.98-4L20 10c0-2.21-1.79-4-4-4s-4 1.79-4 4v6c0 2.21 1.79 4 4 4zm6.6-4c0 4-3.4 6.8-6.6 6.8s-6.6-2.8-6.6-6.8H8c0 4.55 3.62 8.31 8 8.96V28h2v-3.04c4.38-.65 8-4.41 8-8.96h-1.4z" fill="#fff"/>
    </svg>
  `)}`;
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  return (
    <Box>
      {/* Day Picker */}
      <DayPicker selectedDay={showStore.selectedDay} onDayChange={handleDayChange} />

      {/* Map and List Layout - Responsive */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' }, // Stack vertically on mobile
          gap: { xs: 2, md: 3 },
          height: { xs: 'auto', md: '600px' }, // Auto height on mobile
        }}
      >
        {/* Map Section */}
        <Box
          id="map-container"
          sx={{
            flex: { xs: 'none', md: 2 },
            height: { xs: '300px', sm: '400px', md: '100%' }, // Responsive height
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative', // For positioning the location button
          }}
        >
          {API_KEY ? (
            <>
              <APIProvider apiKey={API_KEY} region="US" language="en" version="weekly">
                <Map
                  style={{ width: '100%', height: '100%' }}
                  defaultCenter={mapStore.mapInitialCenter}
                  defaultZoom={mapStore.mapInitialZoom}
                  gestureHandling={'greedy'}
                  disableDefaultUI={false}
                  clickableIcons={true}
                  streetViewControl={false}
                  fullscreenControl={true}
                  zoomControl={true}
                  mapTypeControl={false}
                  scaleControl={false}
                  rotateControl={false}
                  onBoundsChanged={(e) => {
                    if (e.detail.center && e.detail.zoom) {
                      // Debounce map position updates to prevent render loops
                      mapStore.debouncedUpdateMapPosition(e.detail.center, e.detail.zoom);
                    }
                  }}
                >
                  <MapContent
                    theme={theme}
                    handleMarkerClick={handleMarkerClick}
                    formatTime={formatTime}
                    onMapLoad={mapStore.setMapInstance}
                  />
                </Map>
              </APIProvider>

              {/* Location Error Alert */}
              {mapStore.locationError && (
                <Alert
                  severity="warning"
                  onClose={() => mapStore.clearLocationError()}
                  sx={{
                    position: 'absolute',
                    top: 70,
                    right: 16,
                    maxWidth: 300,
                    zIndex: 1000,
                  }}
                >
                  {mapStore.locationError}
                </Alert>
              )}
            </>
          ) : showConfigLoading ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                borderRadius: 2,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={32} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading map...
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 2,
              }}
            >
              <Alert severity="info">
                Map temporarily unavailable. Please refresh the page if it doesn't load shortly.
              </Alert>
            </Box>
          )}
        </Box>

        {/* Show List Section */}
        <Box sx={{ flex: { xs: 'none', md: 1 } }}>
          <Card
            sx={{
              height: { xs: 'auto', md: '100%' },
              minHeight: { xs: '200px', md: '100%' },
            }}
          >
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: { xs: 1.5, md: 2 },
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                    Shows for {showStore.selectedDay}
                  </Typography>
                  {showStore.isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {showStore.showsForSelectedDay.length} show(s) found
                    </Typography>
                  )}
                </Box>

                {/* Current Location Button */}
                <IconButton
                  onClick={() => mapStore.goToCurrentLocation()}
                  size="small"
                  sx={{
                    backgroundColor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    minWidth: 36,
                    height: 36,
                  }}
                  title={
                    mapStore.hasLocationPermission()
                      ? 'Go to current location'
                      : 'Request location permission and go to current location'
                  }
                >
                  <FontAwesomeIcon icon={faLocationArrow} size="sm" />
                </IconButton>
              </Box>

              {/* Location Error Alert */}
              {mapStore.locationError && (
                <Alert
                  severity={mapStore.isLocationDenied() ? 'warning' : 'info'}
                  sx={{
                    mb: 2,
                    fontSize: '0.875rem',
                    '& .MuiAlert-message': {
                      width: '100%',
                    },
                  }}
                  action={
                    mapStore.isLocationDenied() ? (
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => mapStore.clearLocationError()}
                      >
                        Dismiss
                      </Button>
                    ) : null
                  }
                >
                  {mapStore.locationError}
                </Alert>
              )}

              <Box
                ref={showListRef}
                sx={{
                  height: { xs: 'auto', md: 'calc(100% - 80px)' },
                  maxHeight: { xs: '320px', md: 'none' }, // Further reduce height on mobile
                  overflow: 'auto',
                  p: 0,
                  // Custom scrollbar styling
                  '&::-webkit-scrollbar': {
                    width: { xs: '6px', md: '8px' },
                  },
                  '&::-webkit-scrollbar-track': {
                    background: theme.palette.action.hover,
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: theme.palette.primary.main,
                    borderRadius: '4px',
                    '&:hover': {
                      background: theme.palette.primary.dark,
                    },
                  },
                }}
              >
                {showStore.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : showStore.showsForSelectedDay.length === 0 ? (
                  <Box sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                    <Typography variant="body2" color="text.secondary">
                      No shows found for {showStore.selectedDay}
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0, m: '5px', pr: '10px' }}>
                    {showStore.showsForSelectedDay.map((show, index) => (
                      <React.Fragment key={show.id}>
                        <ListItem
                          sx={{ p: 0, mb: { xs: 0.25, md: 0.75 }, mx: { xs: 0.25, md: 0.75 } }}
                        >
                          <ListItemButton
                            data-show-id={show.id}
                            onClick={() => handleShowClick(show)}
                            selected={showStore.selectedShow?.id === show.id}
                            sx={{
                              p: { xs: 1.5, md: 2.5 },
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              border: `1px solid ${theme.palette.divider}`,
                              backgroundColor: theme.palette.background.paper,
                              minHeight: { xs: '105px', md: '130px' }, // Slightly taller to accommodate address on separate line
                              '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                border: `1px solid ${theme.palette.primary.main}`,
                                transform: 'translateY(-2px)',
                                boxShadow: theme.shadows[4],
                              },
                              '&.Mui-selected': {
                                backgroundColor: theme.palette.primary.main + '15',
                                border: `2px solid ${theme.palette.primary.main}`,
                                '&:hover': {
                                  backgroundColor: theme.palette.primary.main + '20',
                                },
                              },
                            }}
                          >
                            {/* Custom layout instead of ListItemText to avoid div-in-p nesting */}
                            <Box sx={{ py: { xs: 0.5, md: 1 }, px: 0, width: '100%' }}>
                              {/* Primary content - Compact mobile layout */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: { xs: 1.5, md: 2 },
                                  mb: { xs: 0.5, md: 0.5 },
                                }}
                              >
                                {/* Icon column */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    minWidth: { xs: '24px', md: '28px' },
                                  }}
                                >
                                  <FontAwesomeIcon
                                    icon={faMicrophone}
                                    style={{
                                      fontSize: '16px',
                                      color: theme.palette.primary.main,
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      width: '2px',
                                      height: { xs: '20px', md: '30px' },
                                      backgroundColor: theme.palette.primary.main,
                                      opacity: 0.3,
                                      borderRadius: '1px',
                                    }}
                                  />
                                </Box>

                                {/* Main content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  {/* Venue name */}
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight={600}
                                    sx={{
                                      fontSize: { xs: '0.95rem', md: '1.1rem' },
                                      lineHeight: 1.2,
                                      mb: 0.5,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {show.venue || show.vendor?.name || 'Unknown Venue'}
                                  </Typography>

                                  {/* Time badge */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      mb: 0.5,
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faClock}
                                      style={{
                                        fontSize: '10px',
                                        color: theme.palette.primary.main,
                                      }}
                                    />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                                        color: theme.palette.primary.main,
                                      }}
                                    >
                                      {formatTime(show.startTime)} - {formatTime(show.endTime)}
                                    </Typography>
                                  </Box>

                                  {/* Compact info rows */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {/* DJ/Host info */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <FontAwesomeIcon
                                        icon={faUser}
                                        style={{
                                          fontSize: '11px',
                                          color: theme.palette.text.secondary,
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          fontSize: { xs: '0.75rem', md: '0.8rem' },
                                          fontWeight: 500,
                                        }}
                                      >
                                        {show.dj?.name || 'Unknown Host'}
                                      </Typography>
                                    </Box>

                                    {/* Location info on separate line */}
                                    <Box
                                      sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faMapMarkerAlt}
                                        style={{
                                          fontSize: '11px',
                                          color: theme.palette.text.secondary,
                                          marginTop: '2px', // Align with first line of text
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          fontSize: { xs: '0.75rem', md: '0.8rem' },
                                          lineHeight: 1.3,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {show.address}
                                      </Typography>
                                    </Box>

                                    {/* Contact info */}
                                    {(show.venuePhone || show.venueWebsite) && (
                                      <Box
                                        sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}
                                      >
                                        {show.venuePhone && (
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                          >
                                            <FontAwesomeIcon
                                              icon={faPhone}
                                              style={{
                                                fontSize: '10px',
                                                color: theme.palette.text.secondary,
                                              }}
                                            />
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{
                                                fontSize: { xs: '0.7rem', md: '0.75rem' },
                                              }}
                                            >
                                              {show.venuePhone}
                                            </Typography>
                                          </Box>
                                        )}
                                        {show.venueWebsite && (
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                          >
                                            <FontAwesomeIcon
                                              icon={faExternalLinkAlt}
                                              style={{
                                                fontSize: '10px',
                                                color: theme.palette.text.secondary,
                                              }}
                                            />
                                            <Typography
                                              component="a"
                                              href={
                                                show.venueWebsite.startsWith('http')
                                                  ? show.venueWebsite
                                                  : `https://${show.venueWebsite}`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              variant="body2"
                                              sx={{
                                                fontSize: { xs: '0.7rem', md: '0.75rem' },
                                                color: theme.palette.primary.main,
                                                textDecoration: 'none',
                                                '&:hover': {
                                                  textDecoration: 'underline',
                                                },
                                              }}
                                            >
                                              Website
                                            </Typography>
                                          </Box>
                                        )}
                                      </Box>
                                    )}
                                  </Box>

                                  {/* Badges section */}
                                  <Box
                                    sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                                  >
                                    {/* Vendor chip */}
                                    {show.vendor?.name && (
                                      <Chip
                                        label={show.vendor.name}
                                        size="small"
                                        sx={{
                                          height: '22px',
                                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                                          fontWeight: 500,
                                          backgroundColor: theme.palette.info.main + '15',
                                          color: theme.palette.info.main,
                                          border: `1px solid ${theme.palette.info.main + '30'}`,
                                          '& .MuiChip-label': {
                                            px: 0.75,
                                          },
                                        }}
                                      />
                                    )}

                                    {/* Show type badge */}
                                    <Box
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        backgroundColor: theme.palette.secondary.main + '15',
                                        color: theme.palette.secondary.main,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.75,
                                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                                        fontWeight: 500,
                                      }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faMusic}
                                        style={{
                                          fontSize: '10px',
                                        }}
                                      />
                                      Karaoke
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Favorite button */}
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    const isFav =
                                      authStore.isAuthenticated &&
                                      favoriteStore.isFavorite(show.id);
                                    if (isFav) {
                                      handleUnfavorite(show.id, showStore.selectedDay);
                                    } else {
                                      handleFavorite(show.id, showStore.selectedDay);
                                    }
                                  }}
                                  sx={{
                                    color:
                                      authStore.isAuthenticated && favoriteStore.isFavorite(show.id)
                                        ? theme.palette.error.main
                                        : theme.palette.text.disabled,
                                    width: { xs: '36px', md: '40px' },
                                    height: { xs: '36px', md: '40px' },
                                    opacity: authStore.isAuthenticated ? 1 : 0.6,
                                    '&:hover': {
                                      color: theme.palette.error.main,
                                      backgroundColor: theme.palette.error.main + '10',
                                    },
                                  }}
                                >
                                  <FontAwesomeIcon
                                    icon={
                                      authStore.isAuthenticated && favoriteStore.isFavorite(show.id)
                                        ? faHeart
                                        : faHeartRegular
                                    }
                                    style={{ fontSize: '16px' }}
                                  />
                                </IconButton>
                              </Box>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                        {index < showStore.showsForSelectedDay.length - 1 && (
                          <Divider sx={{ mx: { xs: 1.5, md: 2 } }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Paywall Modal */}
      <PaywallModal open={showPaywall} onClose={handlePaywallClose} feature={paywallFeature} />

      {/* Local Subscription Modal (for non-authenticated users) */}
      <LocalSubscriptionModal
        open={showLocalSubscription}
        onClose={() => setShowLocalSubscription(false)}
        feature="favorites"
      />

      {/* Login Modal */}
      <Dialog
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FontAwesomeIcon icon={faHeart} />
            Account Required
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Create an account to save your favorite karaoke venues and get personalized
            recommendations.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It's quick, free, and helps you discover the best karaoke experiences in your area!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setLoginModalOpen(false)} color="inherit">
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              setLoginModalOpen(false);
              authStore.loginWithGoogle();
            }}
            variant="contained"
            startIcon={<FontAwesomeIcon icon={faGoogle} />}
          >
            Continue with Google
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default MapComponent;
