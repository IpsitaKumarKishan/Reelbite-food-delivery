import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { useSelector } from "react-redux";

export default function useGetRecommendations() {
  const { currentCity, userData } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    timeSlot: null,
    orderAgain: [],
    forYou: [],
  });

  const fetchRecommendations = useCallback(async () => {
    if (!userData || userData.role !== "user") return;

    try {
      setLoading(true);
      const cityQuery = currentCity ? `?city=${encodeURIComponent(currentCity)}` : "";
      const res = await axios.get(`${serverUrl}/api/recommendations/feed${cityQuery}`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        setData({
          timeSlot: res.data.timeSlot || null,
          orderAgain: res.data.orderAgain || [],
          forYou: res.data.forYou || [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [currentCity, userData]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    ...data,
    loading,
    refetch: fetchRecommendations,
  };
}
