import prisma from '../../core/utils/prisma.js';

// @desc    Get all zones for a project
// @route   GET /api/zones
export const getZones = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { projectId } = req.query;

        const where = {
            organizationId,
            deletedAt: null
        };

        if (projectId) {
            where.projectId = projectId;
        }

        const zones = await prisma.zone.findMany({
            where,
            include: {
                _count: {
                    select: { households: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json({ zones });
    } catch (error) {
        console.error('Get zones error:', error);
        res.status(500).json({ error: 'Server error while fetching zones' });
    }
};

// @desc    Create new zone
// @route   POST /api/zones
export const createZone = async (req, res) => {
    try {
        const { projectId, name } = req.body;
        const { organizationId } = req.user;

        const zone = await prisma.zone.create({
            data: {
                name,
                projectId,
                organizationId
            }
        });

        res.status(201).json(zone);
    } catch (error) {
        console.error('Create zone error:', error);
        res.status(500).json({ error: 'Server error while creating zone' });
    }
};

// @desc    Delete zone
export const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        await prisma.zone.update({
            where: { id, organizationId },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Zone deleted successfully' });
    } catch (error) {
        console.error('Delete zone error:', error);
        res.status(500).json({ error: 'Server error while deleting zone' });
    }
};
