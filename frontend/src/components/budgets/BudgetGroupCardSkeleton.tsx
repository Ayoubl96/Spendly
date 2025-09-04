import React from "react";
import { Card } from "../ui/card";

const BudgetGroupCardSkeleton: React.FC = () => {
  return (
    <Card className="py-12 px-5 animate-pulse">
      <div className="flex items-center justify-between absolute top-2 left-2 right-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
          <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
        </div>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-32 bg-gray-300 rounded"></div>
          </div>
          <div className="h-4 w-48 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 w-64 bg-gray-300 rounded"></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="h-4 w-20 bg-gray-300 rounded mb-1 mx-auto"></div>
            <div className="h-6 w-16 bg-gray-300 rounded mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-4 w-12 bg-gray-300 rounded mb-1 mx-auto"></div>
            <div className="h-6 w-16 bg-gray-300 rounded mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-4 w-20 bg-gray-300 rounded mb-1 mx-auto"></div>
            <div className="h-6 w-16 bg-gray-300 rounded mx-auto"></div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="h-20 w-20 bg-gray-300 rounded-full"></div>
        </div>

        <div className="text-center">
          <div className="h-4 w-24 bg-gray-300 rounded mx-auto"></div>
        </div>

        <div className="pt-4 border-t">
          <div className="h-4 w-20 bg-gray-300 rounded mb-2"></div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-gray-300 rounded"></div>
              <div className="h-3 w-32 bg-gray-300 rounded"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-28 bg-gray-300 rounded"></div>
              <div className="h-3 w-28 bg-gray-300 rounded"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-gray-300 rounded"></div>
              <div className="h-3 w-36 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="h-10 w-full bg-gray-300 rounded"></div>
      </div>
    </Card>
  );
};

export default BudgetGroupCardSkeleton;