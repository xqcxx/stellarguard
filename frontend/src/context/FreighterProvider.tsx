"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  requestAccess,
  isConnected as isFreighterConnected,
  getPublicKey,
  getNetwork,
} from "@stellar/freighter-api";
import { classifyError, AppError, isAppError } from "@/lib/errors";

export interface FreighterContextType {
  address: string | null;
  network: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isFreighterInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const FreighterContext = createContext<FreighterContextType | undefined>(undefined);

export const FreighterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const connected = await isFreighterConnected();
      setIsFreighterInstalled(!!connected);

      if (connected) {
        // Optionally try to get the public key if already authorized
        // Note: getPublicKey might throw if not authorized, but some versions return null
        try {
           const publicKey = await getPublicKey();
           if (publicKey) {
             setAddress(publicKey);
             const currentNetwork = await getNetwork();
             setNetwork(currentNetwork);
           }
        } catch (e) {
          // User not authorized yet, that's fine
        }
      }
    } catch (err) {
      console.error("Error checking Freighter connection:", err);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (!isFreighterInstalled) {
        const stillNotConnected = !(await isFreighterConnected());
        if (stillNotConnected) {
          throw new Error("Freighter extension is not installed");
        }
        setIsFreighterInstalled(true);
      }

      const publicKey = await requestAccess();
      if (publicKey) {
        setAddress(publicKey);
        const currentNetwork = await getNetwork();
        setNetwork(currentNetwork);
      } else {
        setError("User denied access");
      }
    } catch (err) {
      const classified = classifyError(err);
      setError(classified.message || "Failed to connect to Freighter");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setNetwork(null);
    setError(null);
  };

  const value = {
    address,
    network,
    isConnecting,
    isConnected: !!address,
    isFreighterInstalled,
    connect,
    disconnect,
    error,
  };

  return (
    <FreighterContext.Provider value={value}>
      {children}
    </FreighterContext.Provider>
  );
};

export const useFreighter = () => {
  const context = useContext(FreighterContext);
  if (context === undefined) {
    throw new Error("useFreighter must be used within a FreighterProvider");
  }
  return context;
};
