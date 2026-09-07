import React from "react";
import { AlertProps } from "../../hooks/useAlert";
import { Button } from "./button";
import { Card, CardContent } from "./card";

const Alert: React.FC<AlertProps> = ({ id, title, message, onClose }) => {
  return (
    <Card>
      <CardContent>
        <h4>{title}</h4>
        {message && <p>{message}</p>}
        <Button onClick={() => onClose(id)}>Close</Button>
      </CardContent>
    </Card>
  );
};

interface AlertContainerProps {
  alerts: AlertProps[];
  onClose: (id: string) => void;
  onAction?: (actionId: string) => void;
}

export const AlertContainer: React.FC<AlertContainerProps> = ({
  alerts,
  onClose,
  onAction,
}) => {
  return (
    <div>
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          {...alert}
          onClose={onClose}
          onAction={onAction}
        />
      ))}
    </div>
  );
};
