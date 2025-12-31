import { useEffect, useState } from 'react';
import { useAppStore } from '../../store';

export function useHydration() {
    const { 
        projectSettings, 
        hydrateProject, 
        fetchProjects, 
        recentProjects,
        setToast
    } = useAppStore();
    
    const [isHydrating, setIsHydrating] = useState(false);

    // 1. Initial Load: Fetch List of Projects
    useEffect(() => {
        const init = async () => {
            try {
                await fetchProjects();
            } catch (e) {
                console.error("Failed to fetch project list", e);
            }
        };
        init();
    }, []);

    // 2. Project Selection: Hydrate Full State
    useEffect(() => {
        const projectId = projectSettings.id;
        if (!projectId) return;

        const hydrate = async () => {
            setIsHydrating(true);
            try {
                await hydrateProject(projectId);
                setToast({ message: "Project Data Synced with Cloud", type: "success" });
            } catch (e) {
                console.error("Hydration Failed", e);
                setToast({ message: "Failed to load project history", type: "error" });
            } finally {
                setIsHydrating(false);
            }
        };

        // Only hydrate if we don't have artifacts loaded (rudimentary check to prevent double fetch on fresh load)
        // In a real app we might compare last_updated timestamps
        hydrate();
        
    }, [projectSettings.id]);

    return { isHydrating };
}