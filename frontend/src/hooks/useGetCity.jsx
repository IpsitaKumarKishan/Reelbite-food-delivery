import axios from 'axios'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentAddress, setCurrentCity, setCurrentState } from '../redux/userSlice'
import { setAddress, setLocation } from '../redux/mapSlice'

function useGetCity() {
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    const apiKey = import.meta.env.VITE_GEOAPIKEY

    useEffect(() => {
        // If user already has location saved in profile, populate coordinates immediately
        if (userData?.location?.coordinates && (userData.location.coordinates[0] !== 0 || userData.location.coordinates[1] !== 0)) {
            const latitude = userData.location.coordinates[1];
            const longitude = userData.location.coordinates[0];
            dispatch(setLocation({ lat: latitude, lon: longitude }));
        }

        if (!navigator?.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    dispatch(setLocation({ lat: latitude, lon: longitude }));

                    if (apiKey) {
                        const result = await axios.get(
                            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`
                        );
                        const firstRes = result?.data?.results?.[0];
                        if (firstRes) {
                            const detectedCity = firstRes.city || firstRes.county || firstRes.state_district || firstRes.suburb;
                            if (detectedCity) dispatch(setCurrentCity(detectedCity));
                            if (firstRes.state) dispatch(setCurrentState(firstRes.state));
                            const addr = firstRes.address_line2 || firstRes.address_line1;
                            if (addr) {
                                dispatch(setCurrentAddress(addr));
                                dispatch(setAddress(addr));
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Geocoding reverse lookup error:", err?.message || err);
                }
            },
            (err) => {
                // Expected on non-HTTPS origins (like direct EC2 IP)
                console.warn("Geolocation denied or unavailable:", err?.message || err);
            },
            { timeout: 8000, enableHighAccuracy: false }
        );
    }, [userData]);
}

export default useGetCity
