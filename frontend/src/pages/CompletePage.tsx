import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/mindcoder.png";
import completeLogo from "@/assets/complete.png";
import Button from "@/components/ui/Button";

function Complete() {
  const navigate = useNavigate();
  const location = useLocation();

  const previousPage = location.state?.from; 
  const project = location.state?.project;
  const step = location.state?.step;

  const handleNavigateBack = () => {
    navigate(previousPage);
  };

  const handleNavigateToStep = () => {
    if (project && step) {
      navigate(`/progress/${project}/${Number(step) + 1}`);
    } 
  };

  console.log("step", step);
  
  return (
    <div className="flex items-center justify-center w-screen h-screen bg-background">
      <div className="flex flex-col md:flex-row items-center justify-center rounded-2xl overflow-hidden gap-24 p-4">
        <div className="flex justify-center items-center w-full md:w-1/2 bg-muted rounded-2xl p-4">
          <img
            src={logo}
            className="max-h-[50vh] max-w-[50vw] object-contain"
            alt="logo"
          />
        </div>
        <div className="flex flex-col items-center rounded-tl-[30px] rounded-tr-[30px] md:w-[50vh] md:h-[56vh] p-4">
          <img
            src={completeLogo}
            className="max-h-[50vh] max-w-[50vw] object-contain"
            alt="complete logo"
          />
          <div className="flex flex-row gap-3 mt-4">
            <Button variant="secondary" onClick={handleNavigateBack}>
              Cancel
            </Button>

            <Button variant="primary" onClick={handleNavigateToStep}>
              Next to Step Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Complete;
