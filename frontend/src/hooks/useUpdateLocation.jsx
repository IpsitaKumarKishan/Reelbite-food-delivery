import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'

function useUpdateLocation() {
    const { userData } = useSelector(state => state.user)

    useEffect(() => {
        const updateLocation = async (lat, lon) => {
            try {
                await axios.post(`${serverUrl}/api/user/update-location`, { lat, lon }, { withCredentials: true })
            } catch (err) {
                // Silently ignore background location update failures
            }
        }

        if (!navigator?.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (pos?.coords?.latitude && pos?.coords?.longitude) {
                    updateLocation(pos.coords.latitude, pos.coords.longitude)
                }
            },
            (err) => {
                // Expected on non-HTTPS origins
            },
            { timeout: 10000, enableHighAccuracy: false }
        );

        return () => {
            if (watchId && navigator?.geolocation?.clearWatch) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [userData])
}

export default useUpdateLocation
