import { createHashRouter } from "react-router-dom";
import Progress from "@/pages/progress/Progress";
import HomePage from "@/pages/HomePage";
import Complete from "@/pages/CompletePage";
import MainLayout from "@/layout/MainLayout";
// Upload Steps
import AllNeeds from "@/pages/defineneeds/AllNeeds";
// Card Steps
import CardArea from "@/pages/reconstruction/CardArea";
import SearchArea from "@/pages/reconstruction/SearchArea";
import TrashArea from "@/pages/reconstruction/TrashArea";
// Labeling Steps
import Labeling from "@/pages/labeling/Labeling";
// Concept Steps
import Discovering from "@/pages/category/Discovering";
// Visualization Steps
import Visualization from "@/pages/visualization/Visualize";
// Input Area
import InputArea from "@/pages/defineneeds/InputArea";
import SampleDataPreview from "@/pages/SampleDataPreview";

const router = createHashRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/sample-preview",
    element: <SampleDataPreview />,
  },
  {
    path: "/:project/complete",
    element: <Complete />,
  },
  {
    path: "/progress/:project/:step",
    element: <Progress />,
  },
  {
    path: "/defineneeds/:project/:step",
    element: <MainLayout storeType="card" />,
    children: [
      {
        path: "",
        element: <AllNeeds />,
      },
      {
        path: "customize",
        element: <InputArea />,
      },
    ],
  },
  {
    path: "/reconstruction/:project/:step",
    element: <MainLayout storeType="code" />,
    children: [
      {
        path: "card",
        element: <CardArea />,
      },
      {
        path: "search",
        element: <SearchArea />,
      },
      {
        path: "trash",
        element: <TrashArea />,
      },
    ],
  },
  {
    path: "/labeling/:project/:step",
    element: <MainLayout storeType="concept" />,
    children: [
      {
        path: "",
        element: <Labeling />,
      },
    ],
  },
  {
    path: "/category/:project/:step",
    element: <MainLayout storeType="display" />,
    children: [
      {
        path: "",
        element: <Discovering />,
      },
    ],
  },
  {
    path: "/visualization/:project/:step",
    element: <MainLayout />,
    children: [
      {
        path: "",
        element: <Visualization />,
      },
    ],
  },
]);

export default router;
